import type { ReactNode } from "react";
import { getBranch, type BranchMeta } from "@/lib/branches";

interface BranchBadgeProps {
  branch: string | BranchMeta;
  /** Override text. If omitted — показываем `label` ветки («Стратегия», «Логика»...). */
  label?: string;
  /** Override SVG-иконки. Если не задано — иконка из конфига ветки. */
  icon?: ReactNode;
  /** Hex alpha для фона (например "14", "0C", "08"). По умолчанию "14". */
  bgAlpha?: string;
  /** Hex alpha для бордера (например "44", "33"). undefined = без бордера. */
  borderAlpha?: string;
  /** Мелкий / средний размер. */
  size?: "xs" | "sm";
  className?: string;
}

export function BranchBadge({
  branch,
  label,
  icon,
  bgAlpha = "14",
  borderAlpha,
  size = "sm",
  className = "",
}: BranchBadgeProps) {
  const meta = typeof branch === "string" ? getBranch(branch) : branch;

  const sizeStyles =
    size === "xs"
      ? "px-2.5 py-1 text-[9px] tracking-[0.14em] gap-1.5"
      : "px-3 py-1 text-[11px] tracking-widest gap-1.5";

  const style = {
    backgroundColor: `${meta.color}${bgAlpha}`,
    borderColor: borderAlpha ? `${meta.color}${borderAlpha}` : "transparent",
    color: meta.color,
  };

  const defaultIcon = (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={meta.iconPath} />
    </svg>
  );

  return (
    <span
      className={`inline-flex items-center rounded-full border font-bold uppercase ${sizeStyles} ${className}`}
      style={style}
    >
      {icon ?? defaultIcon}
      <span>{label ?? meta.label}</span>
    </span>
  );
}

export default BranchBadge;
