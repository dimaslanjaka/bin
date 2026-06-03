export type OpenCodeAuthData = {
  opencode: {
    type: string;
    key: string;
  };
  nvidia: {
    type: string;
    key: string;
  };
  'github-copilot': {
    type: string;
    refresh: string;
    access: string;
    expires: number;
  };
  google: {
    type: string;
    key: string;
  };
  deepseek: {
    type: string;
    key: string;
  };
  openai: {
    type: string;
    refresh: string;
    access: string;
    expires: number;
    accountId: string;
  };
};
