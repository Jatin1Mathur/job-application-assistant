package com.jatin.jobassistant.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

class PdfTextWriterTest {

	private final PdfTextWriter writer = new PdfTextWriter();

	private String textOf(byte[] pdf) throws IOException {
		try (PDDocument document = Loader.loadPDF(pdf)) {
			return new PDFTextStripper().getText(document);
		}
	}

	@Test
	void writesARealPdfThatContainsTheText() throws IOException {
		byte[] pdf = writer.write("Cover letter", "Dear Hiring Manager,\n\nI am applying for the Java Developer position.\n\nSincerely,\nAlex");

		assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
		assertThat(textOf(pdf)).contains("Dear Hiring Manager,").contains("Java Developer position").contains("Alex");
		try (PDDocument document = Loader.loadPDF(pdf)) {
			assertThat(document.getDocumentInformation().getTitle()).isEqualTo("Cover letter");
			assertThat(document.getNumberOfPages()).isEqualTo(1);
		}
	}

	@Test
	void longLinesAreWrappedAndLongTextsContinueOnTheNextPage() throws IOException {
		String paragraph = "This sentence is repeated to make a very long paragraph. ".repeat(30);
		byte[] pdf = writer.write("Long", (paragraph + "\n\n").repeat(12) + "THE END");

		try (PDDocument document = Loader.loadPDF(pdf)) {
			assertThat(document.getNumberOfPages()).isGreaterThan(1);
		}
		assertThat(textOf(pdf)).contains("THE END");
	}

	@Test
	void charactersTheFontCannotDrawDoNotBreakTheExport() throws IOException {
		byte[] pdf = writer.write("Symbols", "Müller \u2013 \u201Cquoted\u201D \u2026 and \u4F60\u597D and an emoji \uD83D\uDE00");

		String text = textOf(pdf);
		assertThat(text).contains("Müller - \"quoted\" ...");
		assertThat(text).contains("??");
	}

	@Test
	void emptyTextStillGivesAValidPdf() throws IOException {
		try (PDDocument document = Loader.loadPDF(writer.write("Empty", ""))) {
			assertThat(document.getNumberOfPages()).isEqualTo(1);
		}
	}

}
