import Image from "next/image";
import Link from "next/link";

export const supportEmail = "support@kavyx.tech";

export function earlyAccessEmail(role) {
  const audience = role ? " — " + role : "";
  return "mailto:" + supportEmail + "?subject=" + encodeURIComponent("Kavyx early access" + audience);
}

export default function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Kavyx home">
      <Image src="/images/kavyx-mark.svg" width={33} height={33} alt="" unoptimized />
      <span aria-hidden="true">KAVYX</span>
    </Link>
  );
}
