package com.jatin.jobassistant.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

// Writes plain text into a simple A4 PDF: one font, wrapped lines, as many pages as needed.
// Used for "export cover letter as PDF" and for the sample resumes of the demo account.
@Component
public class PdfTextWriter {

	private static final float MARGIN = 64;

	private static final float FONT_SIZE = 11;

	private static final float LINE_HEIGHT = 16;

	public byte[] write(String documentTitle, String text) {
		try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			document.getDocumentInformation().setTitle(documentTitle);
			PDFont font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
			float width = PDRectangle.A4.getWidth() - 2 * MARGIN;
			List<String> lines = wrap(printable(text, font), font, width);

			PDPageContentStream content = null;
			float y = 0;
			for (String line : lines) {
				if (content == null || y < MARGIN) {
					if (content != null) {
						content.endText();
						content.close();
					}
					PDPage page = new PDPage(PDRectangle.A4);
					document.addPage(page);
					content = new PDPageContentStream(document, page);
					content.setFont(font, FONT_SIZE);
					content.setLeading(LINE_HEIGHT);
					content.beginText();
					y = PDRectangle.A4.getHeight() - MARGIN;
					content.newLineAtOffset(MARGIN, y);
				}
				content.showText(line);
				content.newLine();
				y -= LINE_HEIGHT;
			}
			if (content == null) {
				document.addPage(new PDPage(PDRectangle.A4));
			}
			else {
				content.endText();
				content.close();
			}
			document.save(out);
			return out.toByteArray();
		}
		catch (IOException ex) {
			throw new UncheckedIOException("Could not write the PDF", ex);
		}
	}

	// Breaks every paragraph into lines that fit the page width. An empty line stays an empty line.
	private List<String> wrap(String text, PDFont font, float width) throws IOException {
		List<String> lines = new ArrayList<>();
		for (String paragraph : text.split("\\R", -1)) {
			StringBuilder line = new StringBuilder();
			for (String word : paragraph.strip().split("\\s+")) {
				String candidate = line.isEmpty() ? word : line + " " + word;
				if (!line.isEmpty() && font.getStringWidth(candidate) / 1000 * FONT_SIZE > width) {
					lines.add(line.toString());
					line = new StringBuilder(word);
				}
				else {
					line = new StringBuilder(candidate);
				}
			}
			lines.add(line.toString());
		}
		return lines;
	}

	// The built-in PDF fonts know Western European characters only. Typographic quotes and dashes get their
	// plain form; anything else the font cannot draw becomes "?" instead of making the export fail.
	private String printable(String text, PDFont font) {
		String plain = text.replace('\u2018', '\'').replace('\u2019', '\'').replace('\u201C', '"').replace('\u201D', '"')
			.replace('\u2013', '-').replace('\u2014', '-').replace("\u2026", "...").replace('\u00A0', ' ').replace("\t", "    ");
		StringBuilder result = new StringBuilder();
		plain.codePoints().forEach(codePoint -> {
			String character = new String(Character.toChars(codePoint));
			if (character.equals("\n") || character.equals("\r")) {
				result.append(character);
				return;
			}
			try {
				font.encode(character);
				result.append(character);
			}
			catch (IOException | IllegalArgumentException ex) {
				result.append('?');
			}
		});
		return result.toString();
	}

}
