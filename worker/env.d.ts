interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  IMAGES: ImagesBinding;
  AI: Ai;
  ASSETS: Fetcher;
  VISION_MODEL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  /** ローカル確認用のログイン。本番では設定しない */
  DEV_AUTH?: string;
  /** Workers AI に接続できない環境でタグを仮生成する */
  MOCK_AI?: string;
}
