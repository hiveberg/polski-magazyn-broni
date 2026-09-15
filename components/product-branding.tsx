import {
  PRODUCT_SHORT_NAME,
  PRODUCT_WEBSITE_LABEL,
  PRODUCT_WEBSITE_URL,
} from "@/lib/brand";

export function ProductWordmark({ className }: { className: string }) {
  return (
    <span className={className} role="img" aria-label={PRODUCT_SHORT_NAME}>
      <span aria-hidden="true">PM</span>
      <span className="brand-accent" aria-hidden="true">BP</span>
    </span>
  );
}

export function ProductSignature({ suffix }: { suffix?: string }) {
  return (
    <p className="auth-branding">
      <ProductWordmark className="signature-wordmark" />
      <span aria-hidden="true">•</span>
      <a href={PRODUCT_WEBSITE_URL} target="_blank" rel="noreferrer">
        {PRODUCT_WEBSITE_LABEL}
      </a>
      {suffix && (
        <>
          <span aria-hidden="true">•</span>
          <span>{suffix}</span>
        </>
      )}
    </p>
  );
}
