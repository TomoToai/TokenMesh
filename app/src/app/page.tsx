import Link from "next/link";

const stats = [
  { value: "4", label: "Connected Models" },
  { value: "2", label: "Model Providers" },
  { value: "Web3", label: "Native Payments" },
  { value: "GPU-to-Token", label: "Compute Network" },
];

const capabilities = [
  {
    title: "Unified Model Gateway",
    description: "Call global models through one API, compare outputs, latency, reasoning, and token usage side by side.",
    action: "Open Chat",
    href: "/chat",
    visual: "API",
  },
  {
    title: "Web3 Wallet Ready",
    description: "Built for programmable payments with wallets, stablecoin deposits, and on-chain settlement on the roadmap.",
    action: "Explore Web3",
    href: "#web3",
    visual: "W3",
  },
  {
    title: "GPU Compute Network",
    description: "Turn idle GPUs from individuals and teams into inference capacity, then settle rewards as model tokens.",
    action: "Learn More",
    href: "#gpu",
    visual: "GPU",
  },
  {
    title: "Lower Token Cost",
    description: "Route demand to shared compute pools and make unused GPU capacity available as lower-cost model tokens.",
    action: "View Models",
    href: "#models",
    visual: "TOK",
  },
];

const models = [
  { name: "Doubao Seed 2.0 Pro", provider: "Volcengine Ark", status: "Connected" },
  { name: "Doubao Seed 2.0 lite", provider: "Volcengine Ark", status: "Connected" },
  { name: "DeepSeek V4 Flash", provider: "DeepSeek Official API", status: "Connected" },
  { name: "DeepSeek V4 Pro", provider: "DeepSeek Official API", status: "Connected" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            <span className="text-primary">Token</span>
            <span className="text-accent">Mesh</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#models" className="transition-colors hover:text-foreground">
              Models
            </a>
            <Link href="/chat" className="transition-colors hover:text-foreground">
              Chat
            </Link>
            <a href="#web3" className="transition-colors hover:text-foreground">
              Web3
            </a>
            <a href="#gpu" className="transition-colors hover:text-foreground">
              GPU Network
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-foreground">
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="mx-auto flex min-h-[660px] max-w-7xl flex-col items-center justify-center px-5 py-20 text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Web3 Native LLM Gateway
          </div>

          <h1 className="max-w-5xl text-5xl font-semibold leading-tight tracking-normal text-foreground md:text-7xl">
            The Web3 Native Interface for LLMs
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted md:text-xl">
            TokenMesh connects global model access, wallet payments, and shared GPU compute into one token-powered AI network.
          </p>
          <p className="mt-3 text-base font-medium text-accent">
            From everyone mining crypto to everyone contributing model tokens.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-lg bg-primary px-10 py-3 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover sm:w-auto"
            >
              Get Started
            </Link>
            <Link
              href="/chat"
              className="w-full rounded-lg border border-border bg-card px-10 py-3 text-center text-base font-semibold text-foreground shadow-sm transition-colors hover:border-primary/50 sm:w-auto"
            >
              Open Chat
            </Link>
            <a
              href="#models"
              className="w-full rounded-lg border border-transparent px-10 py-3 text-center text-base font-semibold text-primary transition-colors hover:bg-card sm:w-auto"
            >
              Explore Models
            </a>
          </div>

          <div className="mt-20 grid w-full max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card/70 px-4 py-5 text-center">
                <div className="text-2xl font-semibold text-foreground md:text-3xl">{stat.value}</div>
                <div className="mt-2 text-sm text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20">
          <div className="grid gap-5 lg:grid-cols-4">
            {capabilities.map((item, index) => (
              <article key={item.title} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="flex h-44 items-center justify-center border-b border-border bg-card-hover">
                  <div className="relative h-28 w-48">
                    <div className="absolute inset-x-6 top-3 h-px bg-border" />
                    <div className="absolute inset-y-6 left-6 w-px bg-border" />
                    <div className="absolute inset-y-6 right-6 w-px bg-border" />
                    <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold text-primary shadow-sm">
                      {item.visual}
                    </div>
                    {[0, 1, 2, 3].map((dot) => (
                      <div
                        key={dot}
                        className={`absolute h-8 w-8 rounded-full border border-border bg-background shadow-sm ${
                          dot === 0
                            ? "left-2 top-2"
                            : dot === 1
                              ? "right-2 top-2"
                              : dot === 2
                                ? "bottom-2 left-2"
                                : "bottom-2 right-2"
                        }`}
                      >
                        <span
                          className={`mx-auto mt-2 block h-3 w-3 rounded-full ${
                            index === 0
                              ? "bg-primary"
                              : index === 1
                                ? "bg-emerald-500"
                                : index === 2
                                  ? "bg-amber-500"
                                  : "bg-accent"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-3 min-h-24 text-sm leading-6 text-muted">{item.description}</p>
                  <Link href={item.href} className="mt-6 inline-flex text-sm font-medium text-primary hover:text-primary-hover">
                    {item.action}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="models" className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Models</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-normal text-foreground">
                Connected model providers
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted">
                TokenMesh currently connects Volcengine Ark and the DeepSeek Official API. Run the same prompt across models and compare the results in one workspace.
              </p>
            </div>
            <div className="grid gap-3">
              {models.map((model) => (
                <div key={model.name} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-5 py-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{model.name}</div>
                    <div className="mt-1 text-sm text-muted">{model.provider}</div>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                    {model.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="web3" className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8 text-foreground">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Agent Economy</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal">
              Built for machine-readable payments
            </h2>
            <p className="mt-5 text-base leading-7 text-muted">
              AI agents need global, programmable payment rails. TokenMesh links model calls, wallet payments, and compute settlement so agents can buy model capacity directly.
            </p>
          </div>
          <div id="gpu" className="rounded-2xl border border-border bg-card p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">GPU to Token</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">
              Turn idle GPUs into model tokens
            </h2>
            <p className="mt-5 text-base leading-7 text-muted">
              Connect idle GPUs to TokenMesh, deploy inference services, and let the network settle rewards based on usage, task routing, and service quality.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <div>© 2026 TokenMesh. Web3 native model gateway.</div>
          <div className="flex gap-5">
            <Link href="/chat" className="hover:text-foreground">
              Chat
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
