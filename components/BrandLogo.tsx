import Image from "next/image";

export function BrandLogo({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/Logo.png"
      alt="The Adulting Life"
      width={2560}
      height={892}
      priority={priority}
      className={className}
    />
  );
}
