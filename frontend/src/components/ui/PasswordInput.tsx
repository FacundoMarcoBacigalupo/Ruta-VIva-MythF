import { forwardRef, useState } from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Input de contraseña con botón ojo para mostrar/ocultar.
 * Hereda la clase .input del index.css y agrega padding a la derecha para
 * que el texto no quede tapado por el botón.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className, ...rest },
  ref
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={show ? "text" : "password"}
        className={`input pr-10 ${className ?? ""}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={show}
        tabIndex={-1}
        className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-md text-brand-500 hover:text-ink-900 hover:bg-cream-100"
        style={{ transition: "color 160ms ease, background-color 160ms ease" }}
      >
        {show ? (
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 3 L21 21" strokeLinecap="round" />
            <path d="M10.58 10.58 A2 2 0 0 0 13.42 13.42" />
            <path d="M9.88 5.08 A10.94 10.94 0 0 1 12 5 C19 5 22 12 22 12 A13.26 13.26 0 0 1 19.36 15.64" strokeLinecap="round" />
            <path d="M6.61 6.61 C3.93 8.65 2 12 2 12 C2 12 5 19 12 19 A10.73 10.73 0 0 0 17.39 17.39" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M2 12 C2 12 5 5 12 5 C19 5 22 12 22 12 C22 12 19 19 12 19 C5 19 2 12 2 12 Z" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
});
