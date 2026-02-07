/**
 * WalletAddressForm - Form component for submitting an Ethereum wallet address.
 * Uses React Hook Form with Zod validation via the standard-schema resolver.
 */

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { RiWallet3Line, RiArrowRightLine, RiLoader4Line } from "@remixicon/react";

import {
  walletAddressSchema,
  type WalletAddressFormData,
} from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { BlurFade } from "@/components/ui/blur-fade";

interface WalletAddressFormProps {
  onSubmit: (address: string) => void;
  isLoading?: boolean;
}

export function WalletAddressForm({
  onSubmit,
  isLoading = false,
}: WalletAddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WalletAddressFormData>({
    resolver: standardSchemaResolver(walletAddressSchema),
    defaultValues: { walletAddress: "" },
  });

  const handleFormSubmit = (data: WalletAddressFormData) => {
    onSubmit(data.walletAddress);
  };

  return (
    <BlurFade delay={0.3} duration={0.5}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="w-full max-w-lg space-y-3"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <RiWallet3Line className="size-4 text-muted-foreground" />
            </div>
            <Input
              {...register("walletAddress")}
              placeholder="0x742d35Cc6634C0532925a3b..."
              className="h-11 pl-9 pr-3 text-sm font-mono"
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-11 px-5"
            disabled={isLoading}
          >
            {isLoading ? (
              <RiLoader4Line className="size-4 animate-spin" />
            ) : (
              <>
                Analyze
                <RiArrowRightLine className="size-4" data-icon="inline-end" />
              </>
            )}
          </Button>
        </div>

        {errors.walletAddress && (
          <FieldError>{errors.walletAddress.message}</FieldError>
        )}
      </form>
    </BlurFade>
  );
}
