import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="text-primary">Token</span>
          <span className="text-accent">Mesh</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          >
            注册
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            <span className="text-primary">Token</span>
            <span className="text-accent">Mesh</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted">
            大模型聚合平台 — One API for Any Model
          </p>
          <p className="text-base text-muted/70 max-w-xl mx-auto">
            通过统一的 OpenAI 兼容接口，访问全球 400+ 大模型。
            更低价格、更高可用、更安全的数据策略。
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
            {[
              { value: "80T+", label: "月处理 Token" },
              { value: "8M+", label: "全球用户" },
              { value: "60+", label: "供应商" },
              { value: "400+", label: "可用模型" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
              >
                <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 pt-8">
            <Link
              href="/register"
              className="px-8 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-lg font-medium transition-colors"
            >
              免费开始
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border border-border hover:border-primary/50 text-foreground rounded-xl text-lg font-medium transition-colors"
            >
              登录
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        © 2026 TokenMesh. All rights reserved.
      </footer>
    </div>
  );
}
