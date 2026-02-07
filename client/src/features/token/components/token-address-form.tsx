/**
 * TokenAddressForm - Form component for submitting an ERC-20 token contract address.
 * Only rendered after the wallet address has been analyzed successfully.
 */

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  RiCoinLine,
  RiArrowRightLine,
  RiLoader4Line,
} from "@remixicon/react";

import {
  tokenAddressSchema,
  type TokenAddressFormData,
} from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { BlurFade } from "@/components/ui/blur-fade";

interface TokenAddressFormProps {
  onSubmit: (address: string) => void;
  isLoading?: boolean;
}

export function TokenAddressForm({
  onSubmit,
  isLoading = false,
}: TokenAddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TokenAddressFormData>({
    resolver: standardSchemaResolver(tokenAddressSchema),
    defaultValues: { tokenAddress: "" },
  });

  const handleFormSubmit = (data: TokenAddressFormData) => {
    onSubmit(data.tokenAddress);
  };

  return (
    <BlurFade delay={0.2} duration={0.5}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="w-full max-w-lg space-y-3"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <RiCoinLine className="size-4 text-muted-foreground" />
            </div>
            <Input
              {...register("tokenAddress")}
              placeholder="0xA0b86991c6218b36c1d19D4a..."
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
                Scan Token
                <RiArrowRightLine className="size-4" data-icon="inline-end" />
              </>
            )}
          </Button>
        </div>

        {errors.tokenAddress && (
          <FieldError>{errors.tokenAddress.message}</FieldError>
        )}
      </form>
    </BlurFade>
  );
}
