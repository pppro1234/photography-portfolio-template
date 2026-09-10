"use client";

import Link from "next/link";
import { useIntroMotion } from "./IntroMotionProvider";

export default function SiteLink({ href, ...props }) {
  const { prepareHomeReturn } = useIntroMotion();
  return <Link {...props} href={href} onNavigate={() => prepareHomeReturn(href)} />;
}
