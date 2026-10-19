"use client";

import { useState, type FormEvent } from "react";
import { nicknameSchema, type Avatar } from "@chutai/shared";
import { Button } from "@/components/ui/button";
import { randomAvatar, type Profile } from "@/lib/identity";
import { ProfileFields } from "./profile-fields";

interface JoinCardProps {
  code: string;
  initialProfile: Profile | null;
  serverError?: string | null;
  onJoin: (profile: Profile) => Promise<void>;
}

/** Quem chega pelo link escolhe apelido e avatar antes de entrar. */
export function JoinCard({ code, initialProfile, serverError, onJoin }: JoinCardProps) {
  const [nickname, setNickname] = useState(initialProfile?.nickname ?? "");
  const [avatar, setAvatar] = useState<Avatar>(initialProfile?.avatar ?? randomAvatar());
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = nicknameSchema.safeParse(nickname);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await onJoin({ nickname: parsed.data, avatar });
    } catch {
      // A mensagem do servidor chega por `serverError`.
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl border-2 border-tinta bg-white p-6 shadow-carimbo sm:p-8"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-tinta-soft">Você foi chamado para a sala</p>
        <h1 className="font-display text-5xl tracking-wider">{code}</h1>
      </div>
      <ProfileFields
        nickname={nickname}
        avatar={avatar}
        onNickname={setNickname}
        onAvatar={setAvatar}
        error={error ?? serverError ?? undefined}
        autoFocus
      />
      <Button type="submit" size="lg" loading={loading}>
        Entrar na sala
      </Button>
    </form>
  );
}
