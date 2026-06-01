"use client";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const GestionViajes = dynamic(() => import("@/components/GestionViajes"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function Page() { return <GestionViajes />; }
