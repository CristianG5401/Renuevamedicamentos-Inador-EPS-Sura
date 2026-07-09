import { describe, expect, it } from "bun:test";
import {
  parsePipeSeparatedChatIds,
  resolveEpsChatIdsToListen,
} from "../../../application/config/epsChatIds";

describe("parsePipeSeparatedChatIds", () => {
  it("should split pipe-separated chat IDs", () => {
    expect(
      parsePipeSeparatedChatIds("573175180237@c.us|147626817245299@lid"),
    ).toEqual(["573175180237@c.us", "147626817245299@lid"]);
  });

  it("should trim whitespace and ignore empty chunks", () => {
    expect(
      parsePipeSeparatedChatIds(" 573175180237@c.us | | 147626817245299@lid "),
    ).toEqual(["573175180237@c.us", "147626817245299@lid"]);
  });

  it("should deduplicate IDs while preserving first occurrence order", () => {
    expect(
      parsePipeSeparatedChatIds(
        "573175180237@c.us|147626817245299@lid|573175180237@c.us",
      ),
    ).toEqual(["573175180237@c.us", "147626817245299@lid"]);
  });

  it("should return an empty array for missing or blank input", () => {
    expect(parsePipeSeparatedChatIds(undefined)).toEqual([]);
    expect(parsePipeSeparatedChatIds("  |  ")).toEqual([]);
  });
});

describe("resolveEpsChatIdsToListen", () => {
  it("should fall back to epsChatId when raw listen value is missing", () => {
    expect(resolveEpsChatIdsToListen("573175180237@c.us", undefined)).toEqual([
      "573175180237@c.us",
    ]);
  });

  it("should always include epsChatId when omitted from raw listen value", () => {
    expect(
      resolveEpsChatIdsToListen("573175180237@c.us", "147626817245299@lid"),
    ).toEqual(["147626817245299@lid", "573175180237@c.us"]);
  });

  it("should not duplicate epsChatId when already present", () => {
    expect(
      resolveEpsChatIdsToListen(
        "573175180237@c.us",
        "573175180237@c.us|147626817245299@lid",
      ),
    ).toEqual(["573175180237@c.us", "147626817245299@lid"]);
  });
});
