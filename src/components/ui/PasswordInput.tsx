import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Input from './Input';

interface PasswordInputProps extends Omit<React.ComponentProps<typeof Input>, 'type' | 'trailing'> {}

/**
 * Password field with an animated show/hide toggle — used by every auth and
 * security form instead of each page wiring its own useState + Eye/EyeOff
 * pair. Same visual language everywhere, one place to fix later.
 */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      ref={ref}
      type={visible ? 'text' : 'password'}
      autoComplete={props.autoComplete || 'current-password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="text-gray-400 hover:text-gray-600 p-1 relative overflow-hidden"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={visible ? 'hide' : 'show'}
              initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              className="block"
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </motion.span>
          </AnimatePresence>
        </button>
      }
      {...props}
    />
  );
});
PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
