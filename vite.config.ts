import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Cloudflare の認証情報がない環境（ローカル確認）では Workers AI などのリモート接続を使わない
    cloudflare({ remoteBindings: !!process.env.CLOUDFLARE_API_TOKEN }),
  ],
});
