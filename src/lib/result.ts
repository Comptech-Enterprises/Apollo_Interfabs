export type ActionResult = {
  ok: boolean;
  message: string;
  fields?: Record<string, string>;
};

export const initialResult: ActionResult = { ok: false, message: "" };
