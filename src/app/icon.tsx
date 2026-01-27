import Image from "next/image"

export const size = 32
export const contentType = "image/png"

export default function Icon() {
  return (
    <Image
      src="/img/logo_full_content.png"
      alt="contentMachine powered by zoryon"
      width={32}
      height={32}
    />
  )
}
