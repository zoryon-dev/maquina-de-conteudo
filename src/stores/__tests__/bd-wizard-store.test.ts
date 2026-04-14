import { describe, it, expect, beforeEach } from "vitest"
import { useBdWizardStore } from "../bd-wizard-store"

describe("bd-wizard-store", () => {
  beforeEach(() => {
    useBdWizardStore.getState().reset()
  })

  it("transiciona entre steps 1 -> 4", () => {
    const s = useBdWizardStore.getState()
    s.setWizardId(42)
    expect(useBdWizardStore.getState().wizardId).toBe(42)
    expect(useBdWizardStore.getState().currentStep).toBe(1)
    s.goToStep(2)
    expect(useBdWizardStore.getState().currentStep).toBe(2)
    s.goToStep(4)
    expect(useBdWizardStore.getState().currentStep).toBe(4)
  })

  it("consolida seeds em briefing com separadores", () => {
    const s = useBdWizardStore.getState()
    s.setSeeds([
      { id: "s1", type: "theme", value: "x", briefing: "A" },
      { id: "s2", type: "link", value: "https://y", briefing: "B" },
    ])
    const briefing = useBdWizardStore.getState().consolidatedBriefing
    expect(briefing).toContain("A")
    expect(briefing).toContain("B")
    expect(briefing).toContain("FONTE 1")
    expect(briefing).toContain("FONTE 2")
  })

  it("selectedHeadlineId persiste após re-render (leitura subsequente)", () => {
    const s = useBdWizardStore.getState()
    s.setSelectedHeadlineId(3)
    expect(useBdWizardStore.getState().selectedHeadlineId).toBe(3)
    // outro setter não deve limpar selectedHeadlineId
    s.goToStep(4)
    expect(useBdWizardStore.getState().selectedHeadlineId).toBe(3)
  })

  it("setTribalAngle aceita undefined (editorial puro)", () => {
    const s = useBdWizardStore.getState()
    s.setTribalAngle("herege")
    expect(useBdWizardStore.getState().tribalAngle).toBe("herege")
    s.setTribalAngle(undefined)
    expect(useBdWizardStore.getState().tribalAngle).toBeUndefined()
  })

  it("reset limpa todo o estado", () => {
    const s = useBdWizardStore.getState()
    s.setWizardId(1)
    s.setSelectedHeadlineId(5)
    s.setTribalAngle("tradutor")
    s.goToStep(3)
    s.setSeeds([{ id: "s1", type: "theme", value: "x", briefing: "ZZZ" }])
    s.reset()
    const st = useBdWizardStore.getState()
    expect(st.wizardId).toBeNull()
    expect(st.currentStep).toBe(1)
    expect(st.selectedHeadlineId).toBeUndefined()
    expect(st.tribalAngle).toBeUndefined()
    expect(st.seeds).toEqual([])
    expect(st.consolidatedBriefing).toBe("")
  })
})
