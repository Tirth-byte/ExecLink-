"""Tests for deterministic structured entity and fact extraction."""
from __future__ import annotations

import unittest

from services.intelligence.extractor import FactExtractor, tokenize


class TestExtraction(unittest.TestCase):
    def test_extraction_of_p110_sentence(self) -> None:
        """
        Verify extraction of the P-110 sentence:
        Line 24 P-110 equipment erection completed at chainage 18+200 to 18+250.
        """
        sentence = "Line 24 P-110 equipment erection completed at chainage 18+200 to 18+250."
        res = FactExtractor.extract(sentence)

        self.assertEqual("P-110", res.facts.assetId)
        self.assertEqual("mechanical", res.facts.discipline)
        self.assertEqual("erection", res.facts.workType)
        self.assertEqual("completed", res.eventType)

        self.assertIsNotNone(res.facts.location)
        loc = res.facts.location
        assert loc is not None
        self.assertEqual("chainage", loc.kind)
        self.assertEqual(18200.0, loc.start)
        self.assertEqual(18250.0, loc.end)
        self.assertEqual("m", loc.unit)

        self.assertIn("p-110", res.facts.keywords)
        self.assertIn("erection", res.facts.keywords)

    def test_extraction_demo_event_1(self) -> None:
        """EVT-DEMO-001 extraction verification."""
        text = "Fixed 3 tonnes of rebar at Pier P12, chainage 12+410 to 12+425."
        res = FactExtractor.extract(text)

        self.assertEqual("PIER-P12", res.facts.assetId)
        self.assertEqual("structural", res.facts.discipline)
        self.assertEqual("rebar-fixing", res.facts.workType)

        self.assertIsNotNone(res.facts.quantity)
        qty = res.facts.quantity
        assert qty is not None
        self.assertEqual(3.0, qty.value)
        self.assertEqual("t", qty.unit)

        self.assertIsNotNone(res.facts.location)
        loc = res.facts.location
        assert loc is not None
        self.assertEqual(12410.0, loc.start)
        self.assertEqual(12425.0, loc.end)

    def test_extraction_demo_event_2_ambiguous_activity(self) -> None:
        """EVT-DEMO-002 extraction verification."""
        text = "Crew working at P12; preparation continuing."
        res = FactExtractor.extract(text)

        self.assertEqual("PIER-P12", res.facts.assetId)
        self.assertIn("crew", res.facts.keywords)
        self.assertIn("preparation", res.facts.keywords)

    def test_extraction_demo_event_3_unmatched_work(self) -> None:
        """EVT-DEMO-003 extraction verification."""
        text = "Drain cleaning near depot entrance."
        res = FactExtractor.extract(text)

        self.assertEqual("civil", res.facts.discipline)
        self.assertEqual("drain-cleaning", res.facts.workType)
        self.assertIn("drain", res.facts.keywords)
        self.assertIn("depot", res.facts.keywords)

    def test_chainage_single_and_range_variations(self) -> None:
        c1 = FactExtractor.extract_chainage("Section at chainage 5+200 BL")
        self.assertIsNotNone(c1)
        assert c1 is not None
        self.assertEqual(5200.0, c1.start)
        self.assertEqual(5200.0, c1.end)
        self.assertEqual("BL", c1.alignment)

        c2 = FactExtractor.extract_chainage("ch. 10+050 - 10+150 UP")
        self.assertIsNotNone(c2)
        assert c2 is not None
        self.assertEqual(10050.0, c2.start)
        self.assertEqual(10150.0, c2.end)
        self.assertEqual("UP", c2.alignment)

    def test_quantities_and_units(self) -> None:
        q1 = FactExtractor.extract_quantity("Poured 80 m3 concrete")
        self.assertIsNotNone(q1)
        assert q1 is not None
        self.assertEqual(80.0, q1.value)
        self.assertEqual("m3", q1.unit)

        q2 = FactExtractor.extract_quantity("Installed 250 m cable")
        self.assertIsNotNone(q2)
        assert q2 is not None
        self.assertEqual(250.0, q2.value)
        self.assertEqual("m", q2.unit)

    def test_delay_reason_extraction(self) -> None:
        d1 = FactExtractor.extract_delay_reason("Work blocked due to heavy rain and waterlogging")
        self.assertEqual("Blocked due to heavy rain and waterlogging", d1)

        d2 = FactExtractor.extract_delay_reason("Site delayed due to missing safety permit")
        self.assertEqual("Blocked due to missing safety permit", d2)


if __name__ == "__main__":
    unittest.main()
