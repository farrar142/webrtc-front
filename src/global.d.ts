import { NextPage } from 'next';
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_BACKEND_URL: string;
    }
  }
  export type ExtendedNextPage<
    Props = {},
    InitialProps = Props & {
      params: Promise<{ [key: string]: string }>;
    }
  > = NextPage<InitialProps>;
}
export {};
