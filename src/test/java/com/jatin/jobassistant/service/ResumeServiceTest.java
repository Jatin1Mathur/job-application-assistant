package com.jatin.jobassistant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.Optional;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import com.jatin.jobassistant.dto.ResumeResponse;
import com.jatin.jobassistant.dto.ResumeUploadResponse;
import com.jatin.jobassistant.entity.Resume;
import com.jatin.jobassistant.repository.ResumeRepository;

@ExtendWith(MockitoExtension.class)
class ResumeServiceTest {

	@Mock
	private ResumeRepository resumeRepository;

	@InjectMocks
	private ResumeService resumeService;

	@Test
	void uploadExtractsTextAndSavesResume() throws IOException {
		savingAssignsIdAndCreatedAt();
		MockMultipartFile file = pdfFile("resume.pdf", pdfWithText("Jatin Mathur - Java Developer"));

		ResumeUploadResponse response = resumeService.upload(file);

		assertThat(response.id()).isEqualTo(1L);
		assertThat(response.fileName()).isEqualTo("resume.pdf");
		assertThat(response.createdAt()).isNotNull();
		assertThat(response.textPreview()).isEqualTo("Jatin Mathur - Java Developer");
	}

	@Test
	void uploadReturnsOnlyFirst200CharactersAsPreview() throws IOException {
		savingAssignsIdAndCreatedAt();
		String longText = "abcdefghij".repeat(5);
		MockMultipartFile file = pdfFile("resume.pdf", pdfWithText(longText, longText, longText, longText, longText));

		ResumeUploadResponse response = resumeService.upload(file);

		assertThat(response.textPreview()).hasSize(200);
	}

	@Test
	void uploadRejectsMissingFile() {
		assertThatThrownBy(() -> resumeService.upload(null)).isInstanceOf(InvalidFileException.class);
		verify(resumeRepository, never()).save(any());
	}

	@Test
	void uploadRejectsEmptyFile() {
		MockMultipartFile file = pdfFile("resume.pdf", new byte[0]);

		assertThatThrownBy(() -> resumeService.upload(file)).isInstanceOf(InvalidFileException.class);
		verify(resumeRepository, never()).save(any());
	}

	@Test
	void uploadRejectsFileThatIsNotAPdf() {
		MockMultipartFile file = new MockMultipartFile("file", "notes.txt", "text/plain", "hello".getBytes());

		assertThatThrownBy(() -> resumeService.upload(file)).isInstanceOf(InvalidFileException.class)
			.hasMessage("Only PDF files are allowed");
		verify(resumeRepository, never()).save(any());
	}

	@Test
	void uploadRejectsTextFileRenamedToPdf() {
		MockMultipartFile file = pdfFile("fake.pdf", "this is not really a pdf".getBytes());

		assertThatThrownBy(() -> resumeService.upload(file)).isInstanceOf(InvalidFileException.class)
			.hasMessage("Only PDF files are allowed");
	}

	@Test
	void uploadRejectsFileLargerThan5Mb() {
		MockMultipartFile file = pdfFile("big.pdf", new byte[(int) ResumeService.MAX_FILE_SIZE_BYTES + 1]);

		assertThatThrownBy(() -> resumeService.upload(file)).isInstanceOf(InvalidFileException.class)
			.hasMessageContaining("5 MB");
		verify(resumeRepository, never()).save(any());
	}

	@Test
	void uploadRejectsCorruptedPdf() {
		MockMultipartFile file = pdfFile("broken.pdf", "%PDF-1.7 garbage".getBytes());

		assertThatThrownBy(() -> resumeService.upload(file)).isInstanceOf(InvalidFileException.class)
			.hasMessageContaining("Could not read the PDF");
	}

	@Test
	void getByIdReturnsFullResume() {
		Resume resume = new Resume();
		resume.setId(7L);
		resume.setFileName("resume.pdf");
		resume.setExtractedText("full text");
		resume.setCreatedAt(Instant.now());
		when(resumeRepository.findById(7L)).thenReturn(Optional.of(resume));

		ResumeResponse response = resumeService.getById(7L);

		assertThat(response.id()).isEqualTo(7L);
		assertThat(response.fileName()).isEqualTo("resume.pdf");
		assertThat(response.extractedText()).isEqualTo("full text");
	}

	@Test
	void getByIdThrowsWhenResumeDoesNotExist() {
		when(resumeRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> resumeService.getById(99L)).isInstanceOf(ResumeNotFoundException.class)
			.hasMessageContaining("99");
	}

	// The real database fills in id and createdAt; the mock has to do it by hand
	private void savingAssignsIdAndCreatedAt() {
		when(resumeRepository.save(any(Resume.class))).thenAnswer(invocation -> {
			Resume resume = invocation.getArgument(0);
			resume.setId(1L);
			resume.setCreatedAt(Instant.now());
			return resume;
		});
	}

	private MockMultipartFile pdfFile(String fileName, byte[] content) {
		return new MockMultipartFile("file", fileName, "application/pdf", content);
	}

	// Builds a small real PDF in memory, one line of text per argument
	private byte[] pdfWithText(String... lines) throws IOException {
		try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			PDPage page = new PDPage();
			document.addPage(page);
			try (PDPageContentStream content = new PDPageContentStream(document, page)) {
				content.beginText();
				content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
				content.setLeading(16);
				content.newLineAtOffset(50, 700);
				for (String line : lines) {
					content.showText(line);
					content.newLine();
				}
				content.endText();
			}
			document.save(out);
			return out.toByteArray();
		}
	}

}
