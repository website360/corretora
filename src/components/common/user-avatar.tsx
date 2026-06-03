import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  src?: string | null;
  className?: string;
}

export function UserAvatar({ name, src, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("size-8", className)}>
      {src && <AvatarImage src={src} alt={name ?? ""} />}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
