import { describe, expect, it } from "vitest";

import { allocateBill } from "./allocation-engine";
import { prepareAllocationPersistence } from "./allocation-persistence";

describe("prepareAllocationPersistence", () => {
  it("records custom amounts as exact final obligations", () => {
    const result = allocateBill({
      strategy: "custom",
      totalUnits: "10",
      creatorShareUnits: "2",
      participantIds: ["p1", "p2"],
      participantUnits: [
        { participantId: "p1", units: "3" },
        { participantId: "p2", units: "5" },
      ],
    });

    expect(
      prepareAllocationPersistence({
        allocationInput: { strategy: "custom" },
        result,
        participantIds: ["p1", "p2"],
      }),
    ).toEqual({
      strategy: "custom",
      weightScale: null,
      weightTotalUnits: null,
      remainderUnits: "0",
      remainderKind: "none",
      remainderParticipantId: null,
      participants: [
        {
          participantId: "p1",
          inputUnits: "3",
          baseAmountUnits: "3",
          remainderIncrementUnits: "0",
          finalAmountUnits: "3",
        },
        {
          participantId: "p2",
          inputUnits: "5",
          baseAmountUnits: "5",
          remainderIncrementUnits: "0",
          finalAmountUnits: "5",
        },
      ],
    });
  });

  it("records percentage weights and selected-participant remainder provenance", () => {
    const percentages = [
      { participantId: "p1", units: "3333" },
      { participantId: "p2", units: "6667" },
    ];
    const remainderAssignment = {
      kind: "selected_participant" as const,
      participantId: "p2",
    };
    const result = allocateBill({
      strategy: "percentage",
      totalUnits: "10",
      creatorShareUnits: "0",
      participantIds: ["p1", "p2"],
      percentageScale: 2,
      percentages,
      remainderAssignment,
    });

    expect(
      prepareAllocationPersistence({
        allocationInput: {
          strategy: "percentage",
          percentageScale: 2,
          percentages,
          remainderAssignment,
        },
        result,
        participantIds: ["p1", "p2"],
      }),
    ).toMatchObject({
      strategy: "percentage",
      weightScale: 2,
      weightTotalUnits: "10000",
      remainderUnits: "1",
      remainderKind: "selected_participant",
      remainderParticipantId: "p2",
      participants: [
        {
          participantId: "p1",
          inputUnits: "3333",
          baseAmountUnits: "3",
          remainderIncrementUnits: "0",
          finalAmountUnits: "3",
        },
        {
          participantId: "p2",
          inputUnits: "6667",
          baseAmountUnits: "6",
          remainderIncrementUnits: "1",
          finalAmountUnits: "7",
        },
      ],
    });
  });

  it("distinguishes creator, first-participant, and manual remainder rules", () => {
    const participantIds = ["p1", "p2", "p3"];
    for (const assignment of [
      { kind: "creator" as const },
      { kind: "first_participant" as const },
      {
        kind: "manual" as const,
        increments: [
          { participantId: "p1", units: "1" },
          { participantId: "p2", units: "1" },
          { participantId: "p3", units: "0" },
        ],
      },
    ]) {
      const totalUnits = assignment.kind === "manual" ? "11" : "10";
      const result = allocateBill({
        strategy: "equal",
        totalUnits,
        creatorShareUnits: "0",
        participantIds,
        remainderAssignment: assignment,
      });
      const record = prepareAllocationPersistence({
        allocationInput: {
          strategy: "equal",
          remainderAssignment: assignment,
        },
        result,
        participantIds,
      });

      expect(record.remainderKind).toBe(assignment.kind);
      expect(record.remainderUnits).toBe(
        assignment.kind === "manual" ? "2" : "1",
      );
    }
  });
});
