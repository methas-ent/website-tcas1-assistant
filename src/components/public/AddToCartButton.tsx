"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  addCartPackage,
  readCartPackageIds,
} from "@/components/public/cart-storage";

type AddToCartButtonProps = {
  packageId: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
};

export function AddToCartButton({
  packageId,
  size = "md",
  fullWidth,
  className,
}: AddToCartButtonProps) {
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    setIsAdded(readCartPackageIds().includes(packageId));
  }, [packageId]);

  if (isAdded) {
    return (
      <ButtonLink
        className={className}
        fullWidth={fullWidth}
        href="/cart"
        size={size}
        variant="outline"
      >
        ไปที่ตะกร้า
      </ButtonLink>
    );
  }

  return (
    <Button
      className={className}
      fullWidth={fullWidth}
      onClick={() => {
        addCartPackage(packageId);
        setIsAdded(true);
      }}
      size={size}
    >
      เพิ่มลงตะกร้า
    </Button>
  );
}
