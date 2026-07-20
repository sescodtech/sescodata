import { Response } from 'express';
import { ProductService, ELECTRICITY_DISCOS } from '../services/ProductService';
import { ProductOverride } from '../models/ProductOverride';
import { User } from '../models/User';
import { AuditLogService } from '../services/AuditLogService';

async function getActor(req: any): Promise<{ id: string; name: string }> {
  const admin = await User.findById(req.user.id).select('name');
  return { id: req.user.id, name: admin?.name || req.user.email || 'Unknown Admin' };
}

async function upsertOverride(productId: string, category: string, updates: Partial<{ enabled: boolean; visible: boolean; customSellingPrice: number | null; customMarkupPct: number | null }>, actor: { id: string; name: string }) {
  const before = await ProductOverride.findOne({ productId });
  const set: any = { productId, category, updatedBy: actor.id, updatedByName: actor.name };
  if (updates.enabled !== undefined) set.enabled = updates.enabled;
  if (updates.visible !== undefined) set.visible = updates.visible;
  if (updates.customSellingPrice !== undefined) set.customSellingPrice = updates.customSellingPrice;
  if (updates.customMarkupPct !== undefined) set.customMarkupPct = updates.customMarkupPct;

  const after = await ProductOverride.findOneAndUpdate({ productId }, { $set: set }, { new: true, upsert: true });
  return { before, after };
}

export class AdminProductController {
  // ============================================================
  // LISTING & SEARCH
  // ============================================================

  static async listProducts(req: any, res: Response) {
    try {
      const { category, search, status } = req.query as Record<string, string>;
      let products = await ProductService.getFullCatalogForAdmin();

      if (category) products = products.filter((p) => p.category === category);
      if (status === 'enabled') products = products.filter((p) => p.enabled);
      if (status === 'disabled') products = products.filter((p) => !p.enabled);
      if (status === 'hidden') products = products.filter((p) => !p.visible);
      if (search) {
        const q = search.toLowerCase();
        products = products.filter((p) => p.name.toLowerCase().includes(q) || p.provider.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
      }

      const categories = [...new Set((await ProductService.getFullCatalogForAdmin()).map((p) => p.category))];

      res.json({ success: true, products, total: products.length, categories });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async getProviderMapping(_req: any, res: Response) {
    try {
      const products = await ProductService.getFullCatalogForAdmin();
      const byProvider: Record<string, { count: number; categories: Set<string> }> = {};
      products.forEach((p) => {
        if (!byProvider[p.provider]) byProvider[p.provider] = { count: 0, categories: new Set() };
        byProvider[p.provider].count++;
        byProvider[p.provider].categories.add(p.category);
      });
      const mapping = Object.entries(byProvider).map(([provider, data]) => ({
        provider, productCount: data.count, categories: Array.from(data.categories),
      }));
      res.json({ success: true, mapping });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // SINGLE PRODUCT MUTATIONS
  // ============================================================

  static async toggleEnabled(req: any, res: Response) {
    try {
      const { productId } = req.params;
      const { enabled, category, reason } = req.body;
      if (typeof enabled !== 'boolean') return res.status(400).json({ success: false, error: 'enabled must be true or false' });
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });

      const actor = await getActor(req);
      const { before, after } = await upsertOverride(productId, category, { enabled }, actor);

      AuditLogService.log({
        admin: actor, action: enabled ? 'product.enable' : 'product.disable', targetType: 'system', targetId: undefined,
        targetLabel: productId, before: { enabled: before?.enabled ?? true }, after: { enabled }, reason: reason.trim(),
        ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, override: after });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async toggleVisibility(req: any, res: Response) {
    try {
      const { productId } = req.params;
      const { visible, category, reason } = req.body;
      if (typeof visible !== 'boolean') return res.status(400).json({ success: false, error: 'visible must be true or false' });
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });

      const actor = await getActor(req);
      const { before, after } = await upsertOverride(productId, category, { visible }, actor);

      AuditLogService.log({
        admin: actor, action: 'product.visibility_change', targetType: 'system', targetLabel: productId,
        before: { visible: before?.visible ?? true }, after: { visible }, reason: reason.trim(), ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, override: after });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /** Sets custom selling price and/or custom markup % for one product. Passing null clears the override field, reverting to global markup. */
  static async setCustomPricing(req: any, res: Response) {
    try {
      const { productId } = req.params;
      const { category, customSellingPrice, customMarkupPct, reason } = req.body;
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });
      if (customSellingPrice != null && customMarkupPct != null) {
        return res.status(400).json({ success: false, error: 'Set either a custom price or a custom markup, not both' });
      }

      const actor = await getActor(req);
      const before = await ProductOverride.findOne({ productId });
      const { after } = await upsertOverride(productId, category, {
        customSellingPrice: customSellingPrice === undefined ? undefined : customSellingPrice,
        customMarkupPct: customMarkupPct === undefined ? undefined : customMarkupPct,
      }, actor);

      AuditLogService.log({
        admin: actor, action: 'product.pricing_change', targetType: 'system', targetLabel: productId,
        before: { customSellingPrice: before?.customSellingPrice, customMarkupPct: before?.customMarkupPct },
        after: { customSellingPrice, customMarkupPct }, reason: reason.trim(), ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, override: after });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // BULK OPERATIONS
  // ============================================================

  /** Applies a single markup % across every selected product's custom override — a batch version of setCustomPricing. */
  static async bulkUpdatePricing(req: any, res: Response) {
    try {
      const { productIds, customMarkupPct, reason } = req.body as { productIds: string[]; customMarkupPct: number; reason: string };
      if (!Array.isArray(productIds) || productIds.length === 0) return res.status(400).json({ success: false, error: 'No products selected' });
      if (typeof customMarkupPct !== 'number' || customMarkupPct < 0) return res.status(400).json({ success: false, error: 'A valid markup percentage is required' });
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });
      if (productIds.length > 200) return res.status(400).json({ success: false, error: 'Bulk update is limited to 200 products at a time' });

      const actor = await getActor(req);
      const allProducts = await ProductService.getFullCatalogForAdmin();
      const productMap = new Map(allProducts.map((p) => [p.id, p]));

      let updated = 0;
      for (const productId of productIds) {
        const product = productMap.get(productId);
        if (!product) continue;
        await upsertOverride(productId, product.category, { customMarkupPct, customSellingPrice: null }, actor);
        updated++;
      }

      AuditLogService.log({
        admin: actor, action: 'product.bulk_pricing_update', targetType: 'system',
        targetLabel: `${updated} products`, after: { customMarkupPct, productIds }, reason: reason.trim(), ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, message: `Updated pricing for ${updated} product(s)` });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // IMPORT / EXPORT
  // ============================================================

  static async exportPricing(_req: any, res: Response) {
    try {
      const products = await ProductService.getFullCatalogForAdmin();
      const header = 'productId,name,category,provider,costPrice,sellingPrice,enabled,visible\n';
      const rows = products.map((p) =>
        [p.id, `"${p.name.replace(/"/g, '""')}"`, p.category, p.provider, p.costPrice, p.sellingPrice, p.enabled, p.visible].join(',')
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sescohub-pricing-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(header + rows);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * Imports a CSV of productId,customSellingPrice,customMarkupPct,enabled,visible
   * rows and applies them as overrides. Every row is validated independently;
   * bad rows are reported back without blocking the good ones.
   */
  static async importPricing(req: any, res: Response) {
    try {
      const { csv, reason } = req.body as { csv: string; reason: string };
      if (!csv || !csv.trim()) return res.status(400).json({ success: false, error: 'CSV content is required' });
      if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'A reason is required' });

      const actor = await getActor(req);
      const allProducts = await ProductService.getFullCatalogForAdmin();
      const productMap = new Map(allProducts.map((p) => [p.id, p]));

      const lines = csv.trim().split('\n');
      const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
      const idx = {
        productId: header.indexOf('productid'),
        customSellingPrice: header.indexOf('customsellingprice'),
        customMarkupPct: header.indexOf('custommarkuppct'),
        enabled: header.indexOf('enabled'),
        visible: header.indexOf('visible'),
      };
      if (idx.productId === -1) return res.status(400).json({ success: false, error: 'CSV must include a productId column' });

      const results: { row: number; productId: string; success: boolean; error?: string }[] = [];
      let applied = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        const productId = cols[idx.productId];
        if (!productId) continue;

        const product = productMap.get(productId);
        if (!product) {
          results.push({ row: i + 1, productId, success: false, error: 'Unknown product ID' });
          continue;
        }

        const updates: any = {};
        if (idx.customSellingPrice !== -1 && cols[idx.customSellingPrice]) updates.customSellingPrice = Number(cols[idx.customSellingPrice]);
        if (idx.customMarkupPct !== -1 && cols[idx.customMarkupPct]) updates.customMarkupPct = Number(cols[idx.customMarkupPct]);
        if (idx.enabled !== -1 && cols[idx.enabled]) updates.enabled = cols[idx.enabled].toLowerCase() === 'true';
        if (idx.visible !== -1 && cols[idx.visible]) updates.visible = cols[idx.visible].toLowerCase() === 'true';

        await upsertOverride(productId, product.category, updates, actor);
        results.push({ row: i + 1, productId, success: true });
        applied++;
      }

      AuditLogService.log({
        admin: actor, action: 'product.pricing_import', targetType: 'system', targetLabel: `${applied} products`,
        after: { applied, totalRows: lines.length - 1 }, reason: reason.trim(), ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, message: `Applied ${applied} of ${lines.length - 1} rows`, results });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // CATEGORY MARKUP (global) — reuses ProductService.markup, same as before
  // ============================================================

  static async getCategories(_req: any, res: Response) {
    try {
      const products = await ProductService.getFullCatalogForAdmin();
      const categories = [...new Set(products.map((p) => p.category))];
      res.json({ success: true, categories, discos: ELECTRICITY_DISCOS });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
