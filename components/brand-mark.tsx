import Image from "next/image";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark" aria-label="A.R.E.N.A">
      <span className="brand-logo">
        <Image
          src="/arena-club-logo.png"
          alt=""
          width={56}
          height={56}
          priority
        />
      </span>
      {!compact && (
        <span>
          <strong>ARENA</strong>
          <small>IIIT Bhopal</small>
        </span>
      )}
    </div>
  );
}
