import { describe, expect, it } from "vitest";

import { allocateBill, AllocationError } from "./allocation-engine";

const participants = ["alice", "blair", "casey"];

describe("allocateBill", () => {
  it("allocates equal participant obligations without a remainder", () => {
    expect(
      allocateBill({
        strategy: "equal",
        totalUnits: "10000000",
        creatorShareUnits: "1000000",
        participantIds: participants,
      }),
    ).toEqual({
      strategy: "equal",
      totalUnits: "10000000",
      creatorShareUnits: "1000000",
      distributableUnits: "9000000",
      participantObligations: [
        { participantId: "alice", units: "3000000" },
        { participantId: "blair", units: "3000000" },
        { participantId: "casey", units: "3000000" },
      ],
      remainderUnits: "0",
      remainderAssignment: { kind: "none" },
      metadata: { participantCount: 3 },
    });
  });

  it("requires and records an explicit equal-allocation remainder policy", () => {
    expect(() =>
      allocateBill({
        strategy: "equal",
        totalUnits: "10",
        creatorShareUnits: "0",
        participantIds: participants,
      }),
    ).toThrow("A remainder assignment is required");

    expect(
      allocateBill({
        strategy: "equal",
        totalUnits: "10",
        creatorShareUnits: "0",
        participantIds: participants,
        remainderAssignment: { kind: "first_participant" },
      }),
    ).toMatchObject({
      creatorShareUnits: "0",
      participantObligations: [
        { participantId: "alice", units: "4" },
        { participantId: "blair", units: "3" },
        { participantId: "casey", units: "3" },
      ],
      remainderUnits: "1",
      remainderAssignment: {
        kind: "participant",
        participantId: "alice",
        units: "1",
      },
    });
  });

  it("can assign a remainder to the creator or a selected participant", () => {
    expect(
      allocateBill({
        strategy: "equal",
        totalUnits: "10",
        creatorShareUnits: "0",
        participantIds: participants,
        remainderAssignment: { kind: "creator" },
      }),
    ).toMatchObject({
      creatorShareUnits: "1",
      participantObligations: [
        { participantId: "alice", units: "3" },
        { participantId: "blair", units: "3" },
        { participantId: "casey", units: "3" },
      ],
      remainderAssignment: { kind: "creator", units: "1" },
    });

    expect(
      allocateBill({
        strategy: "equal",
        totalUnits: "10",
        creatorShareUnits: "0",
        participantIds: participants,
        remainderAssignment: {
          kind: "selected_participant",
          participantId: "casey",
        },
      }),
    ).toMatchObject({
      participantObligations: [
        { participantId: "alice", units: "3" },
        { participantId: "blair", units: "3" },
        { participantId: "casey", units: "4" },
      ],
      remainderAssignment: {
        kind: "participant",
        participantId: "casey",
        units: "1",
      },
    });
  });

  it("supports a manual distribution of only the computed remainder", () => {
    expect(
      allocateBill({
        strategy: "equal",
        totalUnits: "11",
        creatorShareUnits: "0",
        participantIds: participants,
        remainderAssignment: {
          kind: "manual",
          increments: [
            { participantId: "alice", units: "1" },
            { participantId: "blair", units: "1" },
            { participantId: "casey", units: "0" },
          ],
        },
      }),
    ).toMatchObject({
      participantObligations: [
        { participantId: "alice", units: "4" },
        { participantId: "blair", units: "4" },
        { participantId: "casey", units: "3" },
      ],
      remainderUnits: "2",
      remainderAssignment: {
        kind: "manual",
        increments: [
          { participantId: "alice", units: "1" },
          { participantId: "blair", units: "1" },
          { participantId: "casey", units: "0" },
        ],
      },
    });
  });

  it("allocates by positive shares with deterministic integer arithmetic", () => {
    expect(
      allocateBill({
        strategy: "shares",
        totalUnits: "10",
        creatorShareUnits: "1",
        participantIds: participants,
        shares: [
          { participantId: "alice", units: "2" },
          { participantId: "blair", units: "1" },
          { participantId: "casey", units: "1" },
        ],
        remainderAssignment: {
          kind: "selected_participant",
          participantId: "casey",
        },
      }),
    ).toEqual({
      strategy: "shares",
      totalUnits: "10",
      creatorShareUnits: "1",
      distributableUnits: "9",
      participantObligations: [
        { participantId: "alice", units: "4" },
        { participantId: "blair", units: "2" },
        { participantId: "casey", units: "3" },
      ],
      remainderUnits: "1",
      remainderAssignment: {
        kind: "participant",
        participantId: "casey",
        units: "1",
      },
      metadata: {
        participantCount: 3,
        weightTotal: "4",
      },
    });
  });

  it("requires percentages to total exactly 100% at the declared scale", () => {
    expect(
      allocateBill({
        strategy: "percentage",
        totalUnits: "10",
        creatorShareUnits: "0",
        participantIds: participants,
        percentageScale: 2,
        percentages: [
          { participantId: "alice", units: "3333" },
          { participantId: "blair", units: "3333" },
          { participantId: "casey", units: "3334" },
        ],
        remainderAssignment: {
          kind: "selected_participant",
          participantId: "casey",
        },
      }),
    ).toMatchObject({
      strategy: "percentage",
      participantObligations: [
        { participantId: "alice", units: "3" },
        { participantId: "blair", units: "3" },
        { participantId: "casey", units: "4" },
      ],
      remainderUnits: "1",
      metadata: {
        participantCount: 3,
        percentageScale: 2,
        weightTotal: "10000",
      },
    });

    expect(() =>
      allocateBill({
        strategy: "percentage",
        totalUnits: "10",
        creatorShareUnits: "0",
        participantIds: participants,
        percentageScale: 2,
        percentages: [
          { participantId: "alice", units: "3333" },
          { participantId: "blair", units: "3333" },
          { participantId: "casey", units: "3333" },
        ],
      }),
    ).toThrow("Participant percentages must total exactly 100%.");
  });

  it("validates an exact custom allocation without recalculation", () => {
    expect(
      allocateBill({
        strategy: "custom",
        totalUnits: "10000000",
        creatorShareUnits: "2000000",
        participantIds: ["alice", "blair"],
        participantUnits: [
          { participantId: "alice", units: "3000000" },
          { participantId: "blair", units: "5000000" },
        ],
      }),
    ).toEqual({
      strategy: "custom",
      totalUnits: "10000000",
      creatorShareUnits: "2000000",
      distributableUnits: "8000000",
      participantObligations: [
        { participantId: "alice", units: "3000000" },
        { participantId: "blair", units: "5000000" },
      ],
      remainderUnits: "0",
      remainderAssignment: { kind: "none" },
      metadata: { participantCount: 2 },
    });
  });

  it("rejects malformed, incomplete, or non-positive final allocations", () => {
    expect(() =>
      allocateBill({
        strategy: "custom",
        totalUnits: "10",
        creatorShareUnits: "2",
        participantIds: ["alice", "alice"],
        participantUnits: [
          { participantId: "alice", units: "3" },
          { participantId: "alice", units: "5" },
        ],
      }),
    ).toThrow(AllocationError);

    expect(() =>
      allocateBill({
        strategy: "custom",
        totalUnits: "10",
        creatorShareUnits: "2",
        participantIds: ["alice", "blair"],
        participantUnits: [
          { participantId: "alice", units: "3" },
          { participantId: "blair", units: "4" },
        ],
      }),
    ).toThrow("must equal the Bill total");

    expect(() =>
      allocateBill({
        strategy: "equal",
        totalUnits: "2",
        creatorShareUnits: "0",
        participantIds: participants,
        remainderAssignment: { kind: "first_participant" },
      }),
    ).toThrow("Every participant must receive a positive final obligation.");

    expect(() =>
      allocateBill({
        strategy: "equal",
        totalUnits: "11",
        creatorShareUnits: "0",
        participantIds: participants,
        remainderAssignment: {
          kind: "manual",
          increments: [
            { participantId: "alice", units: "1" },
            { participantId: "blair", units: "0" },
            { participantId: "casey", units: "0" },
          ],
        },
      }),
    ).toThrow("must equal the computed remainder exactly");
  });
});
