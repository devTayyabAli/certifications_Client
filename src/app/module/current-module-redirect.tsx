"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { isAuthenticated, modulesApi } from "@/lib/api";
import { modulePath, pickCurrentModule } from "@/lib/modules";

export default function CurrentModuleRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    modulesApi
      .getAll()
      .then((modules) => {
        if (cancelled) return;
        const current = pickCurrentModule(modules);
        router.replace(current ? modulePath(current) : "/dashboard");
      })
      .catch(() => {
        if (!cancelled) router.replace("/dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="grid min-h-screen place-items-center bg-[#f8f8fc] text-[13px] text-[#8e8ea6]">
      Opening your module…
    </div>
  );
}
