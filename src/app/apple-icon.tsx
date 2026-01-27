import Image from "next/image"

export const size = 180
export const contentType = "image/png"

export default function AppleIcon() {
  return (
    <Image
      src="/img/logo_full_content.png"
      alt="contentMachine powered by zoryon"
      width={180}
      height={180}
    />
  )
}
