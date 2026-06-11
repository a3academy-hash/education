// /dev/gallery — every UI primitive in every state, every math primitive in
// representative interactive states (mr-gates condition 7: notFound() in
// production). The interactive demos live in a client component.

import { notFound } from "next/navigation";
import { GalleryClient } from "./GalleryClient";

export const metadata = {
  title: "UI Gallery (dev) — A3 Academy",
};

export default function GalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <GalleryClient />;
}
