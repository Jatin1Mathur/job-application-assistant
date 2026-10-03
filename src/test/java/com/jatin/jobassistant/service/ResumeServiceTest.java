package com.jatin.jobassistant.service;

import com.jatin.jobassistant.entity.ResumeFile;
import com.jatin.jobassistant.repository.ResumeFileRepository;
import org.mockito.Spy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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

	private static final Long USER_ID = 1L;

	private static final Long OTHER_USER_ID = 2L;

	@Mock
	private ResumeRepository resumeRepository;

	@Mock
	private ResumeFileRepository resumeFileRepository;

	@Spy
	private SkillCatalog skillCatalog = new SkillCatalog();

	@InjectMocks
	private ResumeService resumeService;

	@Test
	void uploadExtractsTextAndSavesResume() throws IOException {
		savingAssignsIdAndCreatedAt();
		MockMultipartFile file = pdfFile("resume.pdf", pdfWithText("Jatin Mathur - Java Developer"));

		ResumeUploadResponse response = resumeService.upload(USER_ID, file);

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

		ResumeUploadResponse response = resumeService.upload(USER_ID, file);

		assertThat(response.textPreview()).hasSize(200);
	}

	@Test
	void uploadRejectsMissingFile() {
		assertThatThrownBy(() -> resumeService.upload(USER_ID, null)).isInstanceOf(InvalidFileException.class);
		verify(resumeRepository, never()).save(any());
	}

	@Test
	void uploadRejectsEmptyFile() {
		MockMultipartFile file = pdfFile("resume.pdf", new byte[0]);

		assertThatThrownBy(() -> resumeService.upload(USER_ID, file)).isInstanceOf(InvalidFileException.class);
		verify(resumeRepository, never()).save(any());
	}

	@Test
	void uploadRejectsFileThatIsNotAPdf() {
		MockMultipartFile file = new MockMultipartFile("file", "notes.txt", "text/plain", "hello".getBytes());

		assertThatThrownBy(() -> resumeService.upload(USER_ID, file)).isInstanceOf(InvalidFileException.class)
			.hasMessage("Only PDF files are allowed");
		verify(resumeRepository, never()).save(any());
	}

	@Test
	void uploadRejectsTextFileRenamedToPdf() {
		MockMultipartFile file = pdfFile("fake.pdf", "this is not really a pdf".getBytes());

		assertThatThrownBy(() -> resumeService.upload(USER_ID, file)).isInstanceOf(InvalidFileException.class)
			.hasMessage("Only PDF files are allowed");
	}

	@Test
	void uploadRejectsFileLargerThan5Mb() {
		MockMultipartFile file = pdfFile("big.pdf", new byte[(int) ResumeService.MAX_FILE_SIZE_BYTES + 1]);

		assertThatThrownBy(() -> resumeService.upload(USER_ID, file)).isInstanceOf(InvalidFileException.class)
			.hasMessageContaining("5 MB");
		verify(resumeRepository, never()).save(any());
	}

	@Test
	void uploadRejectsCorruptedPdf() {
		MockMultipartFile file = pdfFile("broken.pdf", "%PDF-1.7 garbage".getBytes());

		assertThatThrownBy(() -> resumeService.upload(USER_ID, file)).isInstanceOf(InvalidFileException.class)
			.hasMessageContaining("Could not read the PDF");
	}

	@Test
	void getByIdReturnsFullResume() {
		Resume resume = new Resume();
		resume.setId(7L);
		resume.setFileName("resume.pdf");
		resume.setExtractedText("full text");
		resume.setCreatedAt(Instant.now());
		when(resumeRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(resume));

		ResumeResponse response = resumeService.getById(USER_ID, 7L);

		assertThat(response.id()).isEqualTo(7L);
		assertThat(response.fileName()).isEqualTo("resume.pdf");
		assertThat(response.extractedText()).isEqualTo("full text");
	}

	@Test
	void uploadSavesTheResumeForTheLoggedInUser() throws IOException {
		savingAssignsIdAndCreatedAt();

		resumeService.upload(USER_ID, pdfFile("resume.pdf", pdfWithText("Java Developer")));

		ArgumentCaptor<Resume> saved = ArgumentCaptor.forClass(Resume.class);
		verify(resumeRepository).save(saved.capture());
		assertThat(saved.getValue().getUserId()).isEqualTo(USER_ID);
	}

	@Test
	void getByIdThrowsNotFoundForAResumeOfAnotherUser() {
		// The resume exists, but the query "id AND user id" finds nothing for a different user
		when(resumeRepository.findByIdAndUserId(7L, OTHER_USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> resumeService.getById(OTHER_USER_ID, 7L))
			.isInstanceOf(ResumeNotFoundException.class);
	}

	@Test
	void listReturnsOnlyTheUsersResumesWithAPreview() {
		Resume resume = new Resume();
		resume.setId(7L);
		resume.setUserId(USER_ID);
		resume.setFileName("resume.pdf");
		resume.setExtractedText("x".repeat(500));
		resume.setCreatedAt(Instant.now());
		when(resumeRepository.findByUserIdOrderByCreatedAtDescIdDesc(USER_ID)).thenReturn(List.of(resume));
		when(resumeRepository.findByUserIdOrderByCreatedAtDescIdDesc(OTHER_USER_ID)).thenReturn(List.of());

		List<ResumeUploadResponse> mine = resumeService.list(USER_ID);

		assertThat(mine).hasSize(1);
		assertThat(mine.get(0).id()).isEqualTo(7L);
		assertThat(mine.get(0).textPreview()).hasSize(200);
		assertThat(resumeService.list(OTHER_USER_ID)).isEmpty();
	}

	@Test
	void getByIdThrowsWhenResumeDoesNotExist() {
		when(resumeRepository.findByIdAndUserId(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> resumeService.getById(USER_ID, 99L)).isInstanceOf(ResumeNotFoundException.class)
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

	@Test
	void uploadKeepsThePdfItselfAndFindsTheSkillsInItsText() throws IOException {
		savingAssignsIdAndCreatedAt();
		byte[] pdf = pdfWithText("Backend developer: Java, Spring Boot and Docker");

		ResumeUploadResponse response = resumeService.upload(USER_ID, pdfFile("resume.pdf", pdf));

		assertThat(response.detectedSkills()).containsExactly("Java", "Spring Boot", "Docker");
		assertThat(response.hasFile()).isTrue();
		ArgumentCaptor<ResumeFile> stored = ArgumentCaptor.forClass(ResumeFile.class);
		verify(resumeFileRepository).save(stored.capture());
		assertThat(stored.getValue().getResumeId()).isEqualTo(1L);
		assertThat(stored.getValue().getData()).isEqualTo(pdf);
	}

	@Test
	void getFileReturnsTheStoredPdfOfTheOwner() {
		Resume resume = new Resume();
		resume.setId(5L);
		resume.setFileName("resume.pdf");
		when(resumeRepository.findByIdAndUserId(5L, USER_ID)).thenReturn(Optional.of(resume));
		when(resumeFileRepository.findById(5L)).thenReturn(Optional.of(new ResumeFile(5L, new byte[] { 1, 2, 3 })));

		ResumeService.ResumeFileContent file = resumeService.getFile(USER_ID, 5L);

		assertThat(file.fileName()).isEqualTo("resume.pdf");
		assertThat(file.data()).containsExactly(1, 2, 3);
	}

	@Test
	void getFileOfAnotherUserIsNotFoundAndTheFileIsNeverLoaded() {
		when(resumeRepository.findByIdAndUserId(5L, OTHER_USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> resumeService.getFile(OTHER_USER_ID, 5L)).isInstanceOf(ResumeNotFoundException.class);
		verify(resumeFileRepository, never()).findById(any());
	}

	@Test
	void getFileIsNotFoundForAResumeUploadedBeforeFilesWereStored() {
		Resume resume = new Resume();
		resume.setId(5L);
		when(resumeRepository.findByIdAndUserId(5L, USER_ID)).thenReturn(Optional.of(resume));
		when(resumeFileRepository.findById(5L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> resumeService.getFile(USER_ID, 5L)).isInstanceOf(ResumeNotFoundException.class);
	}

}
