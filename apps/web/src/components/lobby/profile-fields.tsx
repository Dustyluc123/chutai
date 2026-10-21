"use client";

import { AVATARS, LIMITS, type Avatar as AvatarEmoji } from "@chutai/shared";
import { Field, Input } from "@/components/ui/input";
import { avatarBackground } from "@/lib/colors";
import { cn } from "@/lib/cn";

interface ProfileFieldsProps {
  nickname: string;
  avatar: AvatarEmoji;
  onNickname: (value: string) => void;
  onAvatar: (value: AvatarEmoji) => void;
  error?: string;
  autoFocus?: boolean;
}

/** Apelido + escolha de avatar. Usado para criar sala, entrar por código e entrar pelo link. */
export function ProfileFields({
  nickname,
  avatar,
  onNickname,
  onAvatar,
  error,
  autoFocus,
}: ProfileFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Seu apelido" error={error}>
        {(props) => (
          <Input
            {...props}
            value={nickname}
            maxLength={LIMITS.nickname.max}
            autoComplete="nickname"
            autoFocus={autoFocus}
            placeholder="Como te chamam?"
            onChange={(event) => onNickname(event.target.value)}
          />
        )}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Avatar</legend>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
          {AVATARS.map((emoji) => {
            const selected = emoji === avatar;
            return (
              <label
                key={emoji}
                className={cn(
                  "flex aspect-square cursor-pointer items-center justify-center rounded-xl border-2 text-xl transition-transform",
                  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-chiclete",
                  selected
                    ? cn("scale-105 border-tinta shadow-carimbo-sm", avatarBackground(emoji))
                    : "border-transparent bg-papel hover:border-linha",
                )}
              >
                <input
                  type="radio"
                  name="avatar"
                  className="sr-only"
                  checked={selected}
                  onChange={() => onAvatar(emoji)}
                  aria-label={`Avatar ${emoji}`}
                />
                <span aria-hidden>{emoji}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
