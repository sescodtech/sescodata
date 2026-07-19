import { Response } from 'express';
import { ProductService } from '../services/ProductService';

export class ProductController {
  static async list(_req: any, res: Response) {
    try {
      // Public-facing catalog never includes provider cost price.
      const catalog = await ProductService.getPublicCatalog();
      res.json({ success: true, products: catalog });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async getOne(req: any, res: Response) {
    try {
      const { id } = req.params;
      const product = await ProductService.getProductById(id);
      if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
      const { costPrice, ...publicProduct } = product;
      res.json({ success: true, product: publicProduct });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
