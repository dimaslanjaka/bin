import { expect, jest, test } from "@jest/globals";

let sendLine: (line: string) => void;
let sendClose: () => void;

jest.mock("readline", () => {
  return {
    createInterface: () => {
      return {
        on: (event: string, callback: (...args: any) => void) => {
          switch (event) {
            case "line":
              sendLine = callback;
              break;
            case "close":
              sendClose = callback;
              break;
          }
        }
      };
    }
  };
});

test("input lines has duplicate key", async () => {
  // given
  const spyConsoleLog = jest.spyOn(console, "log");

  // when

  // Use dynamic import to load the module
  await import("./readline-mock");
  sendLine("hello world");
  sendLine("foo baz");
  sendLine("hoge fuga");
  sendLine("hoge piyo");
  sendClose();

  // then
  expect(spyConsoleLog).toHaveBeenCalledWith('{"hello":"world","foo":"baz","hoge":"fuga"}');
});
