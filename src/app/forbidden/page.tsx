import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <ShieldX className="h-16 w-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Truy cập bị từ chối</h1>
      <p className="text-muted-foreground mb-6">
        Bạn không có quyền truy cập trang này.
      </p>
      <Button asChild>
        <Link href="/">Quay về Trang chủ</Link>
      </Button>
    </div>
  );
}
