"use client";

import { useState, useTransition } from "react";

type HiddenFields = Record<string, string | number | boolean | null | undefined>;

type ConfirmActionButtonProps = {
  action?: (formData: FormData) => void | Promise<void>;
  onConfirm?: () => void | Promise<void>;
  children: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  hiddenFields?: HiddenFields;
  buttonClassName?: string;
  confirmButtonClassName?: string;
  variant?: "default" | "danger";
  disabled?: boolean;
};

export function ConfirmActionButton({
  action,
  onConfirm,
  children,
  title,
  description,
  confirmLabel = "Bekräfta",
  cancelLabel = "Avbryt",
  hiddenFields = {},
  buttonClassName,
  confirmButtonClassName,
  variant = "default",
  disabled = false,
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

 function submitConfirmed() {
  startTransition(async () => {
    if (onConfirm) {
      await onConfirm();
      setOpen(false);
      return;
    }

    if (!action) {
      setOpen(false);
      return;
    }

    const formData = new FormData();

    for (const [key, value] of Object.entries(hiddenFields)) {
      if (value !== null && value !== undefined) {
        formData.set(key, String(value));
      }
    }

    await action(formData);
    setOpen(false);
  });
}

  const defaultButtonClass =
    "rounded-xl border border-sky-400/40 bg-sky-950/30 px-4 py-2 text-sm text-sky-100 hover:bg-sky-900/50 hover:scale-[1.05] hover:duration-300 duration-300 active:bg-sky-400/30 active:scale-[0.97] active:duration-300";

  const defaultConfirmClass =
    variant === "danger"
      ? "rounded-xl bg-red-500 px-4 py-2 text-sm font-bold hover:scale-[1.05] duration-300 text-white hover:bg-red-400 active:scale-[0.97] active:duration-300 active:bg-red-400/80 disabled:opacity-60"
      : "rounded-xl bg-[#f9d142] px-4 py-2 text-sm font-bold text-slate-950 hover:bg-[#ffe16a] hover:duration-300 disabled:opacity-60 hover:scale-[1.05] duration-300 active:bg-yellow-300/80 active:scale-[0.97] active:duration-300";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={buttonClassName ?? defaultButtonClass}
      >
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-sky-400/20 bg-[#0e1b38] p-6 shadow-2xl shadow-blue-950/60">
            <h2 className="text-xl font-bold text-white">{title}</h2>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              {description}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              
              
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-xl border border-sky-400/30 px-4 py-2 text-sm text-sky-100 hover:bg-sky-900/40 disabled:opacity-60 hover:scale-[1.05] duration-300 active:bg-sky-400/30 active:scale-[0.97] active:duration-300"
              >
                {cancelLabel}
              </button>

              <button
                type="button"
                onClick={submitConfirmed}
                disabled={isPending}
                className={confirmButtonClassName ?? defaultConfirmClass}
              >
                {isPending ? "Sparar..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}