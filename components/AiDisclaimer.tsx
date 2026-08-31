const TEXT =
  "Standard terms apply. AI answers are a guide only, not personal advice. Always check important decisions with the right professional.";

interface Props {
  variant?: "inline" | "footer";
  className?: string;
}

export function AiDisclaimer({ variant = "footer", className }: Props) {
  if (variant === "inline") {
    return (
      <p
        className={
          "text-[11px] italic text-tal-plum-soft " + (className ?? "")
        }
      >
        {TEXT}
      </p>
    );
  }
  return (
    <div
      className={
        "mt-3 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 text-[11px] italic text-violet-900 " +
        (className ?? "")
      }
    >
      {TEXT}
    </div>
  );
}
