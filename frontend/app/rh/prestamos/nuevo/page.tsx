"use client";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const PrestamoForm = dynamic(() => import("@/components/PrestamoForm"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function NuevoPrestamoPage() { return <PrestamoForm />; }
