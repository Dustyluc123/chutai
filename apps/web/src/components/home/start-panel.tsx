"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SETTINGS,
  ROOM_CODE_LENGTH,
  nicknameSchema,
  roomCodeSchema,
  type Avatar,
  type ThemeSummary,
} from "@chutai/shared";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ProfileFields } from "@/components/lobby/profile-fields";
import { getSocket, unwrap, waitForConnection } from "@/lib/socket";
import { loadProfile, randomAvatar, saveProfile, saveRoomSession } from "@/lib/identity";
import { THEME_COLORS } from "@/lib/colors";
import { cn } from "@/lib/cn";

type Tab = "create" | "join";

/** Cartão principal da página inicial: criar sala ou entrar com código. */
export function StartPanel({ themes }: { themes: ThemeSummary[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("create");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("🦜");
  const [themeSlug, setThemeSlug] = useState(themes[0]?.slug ?? DEFAULT_SETTINGS.themeSlug);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<{ nickname?: string; code?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  // Lembra o perfil e lê ?tema= e ?codigo= da URL (links de "criar sala com este tema").
  useEffect(() => {
    const profile = loadProfile();
    if (profile) {
      setNickname(profile.nickname);
      setAvatar(profile.avatar);
    } else {
      setAvatar(randomAvatar());
    }
    const params = new URLSearchParams(window.location.search);
    const tema = params.get("tema");
    if (tema && themes.some((theme) => theme.slug === tema)) setThemeSlug(tema);
    const codigo = params.get("codigo");
    if (codigo) {
      setTab("join");
      setCode(codigo.toUpperCase().slice(0, ROOM_CODE_LENGTH));
    }
  }, [themes]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nick = nicknameSchema.safeParse(nickname);
    const parsedCode = tab === "join" ? roomCodeSchema.safeParse(code) : null;
    const nextErrors = {
      nickname: nick.success ? undefined : nick.error.issues[0]?.message,
      code: parsedCode && !parsedCode.success ? parsedCode.error.issues[0]?.message : undefined,
    };
    setErrors(nextErrors);
    if (!nick.success || nextErrors.code) return;

    setLoading(true);
    try {
      const socket = getSocket();
      await waitForConnection(socket);
      const profile = { nickname: nick.data, avatar };
      const joined = unwrap(
        tab === "create"
          ? await socket.emitWithAck("room:create", { ...profile, settings: { themeSlug } })
          : await socket.emitWithAck("room:join", { ...profile, code: parsedCode!.data! }),
      );
      saveProfile(profile);
      saveRoomSession(joined);
      router.push(`/sala/${joined.code}`);
    } catch (err) {
      setErrors({ form: (err as Error).message });
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border-2 border-tinta bg-white text-tinta shadow-[6px_6px_0_var(--color-tinta)]">
      <div
        role="tablist"
        aria-label="Como você quer jogar"
        className="grid grid-cols-2 border-b-2 border-tinta"
      >
        {(
          [
            ["create", "Criar sala"],
            ["join", "Entrar com código"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`aba-${value}`}
            aria-selected={tab === value}
            aria-controls="painel-inicio"
            onClick={() => {
              setTab(value);
              setErrors({});
            }}
            className={cn(
              "h-14 cursor-pointer text-sm font-bold transition-colors first:rounded-tl-[22px] last:rounded-tr-[22px] sm:text-base",
              tab === value ? "bg-white" : "bg-papel text-tinta-soft hover:text-tinta",
              value === "create" && "border-r-2 border-tinta",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        id="painel-inicio"
        role="tabpanel"
        aria-labelledby={`aba-${tab}`}
        onSubmit={submit}
        className="flex flex-col gap-5 p-5 sm:p-6"
        noValidate
      >
        {tab === "join" ? (
          <Field label="Código da sala" error={errors.code}>
            {(props) => (
              <Input
                {...props}
                value={code}
                inputMode="text"
                autoCapitalize="characters"
                maxLength={ROOM_CODE_LENGTH}
                placeholder="EX: K7PQ2M"
                onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s/g, ""))}
                className="font-display h-14 text-center text-2xl tracking-[0.3em] placeholder:text-base placeholder:tracking-normal"
              />
            )}
          </Field>
        ) : null}

        <ProfileFields
          nickname={nickname}
          avatar={avatar}
          onNickname={setNickname}
          onAvatar={setAvatar}
          error={errors.nickname}
        />

        {tab === "create" ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-semibold">Tema</legend>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((theme) => {
                const selected = theme.slug === themeSlug;
                return (
                  <label
                    key={theme.slug}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-1 py-2.5 text-center text-xs leading-tight font-semibold transition-colors",
                      "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-chiclete",
                      selected
                        ? cn("border-tinta", THEME_COLORS[theme.color].soft)
                        : "border-linha hover:border-tinta/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="tema-inicial"
                      className="sr-only"
                      checked={selected}
                      onChange={() => setThemeSlug(theme.slug)}
                    />
                    <span aria-hidden className="text-2xl leading-none">
                      {theme.emoji}
                    </span>
                    {theme.name}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-tinta-soft">Rodadas, tempo e dicas você ajusta na sala.</p>
          </fieldset>
        ) : null}

        {errors.form ? (
          <p
            role="alert"
            className="rounded-xl bg-pitanga/10 px-3 py-2 text-sm font-semibold text-pitanga"
          >
            {errors.form}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={loading}>
          {tab === "create" ? "Criar sala" : "Entrar na sala"}
        </Button>
      </form>
    </div>
  );
}
