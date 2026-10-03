package com.jatin.jobassistant.service;

import com.jatin.jobassistant.repository.ResumeFileRepository;
import com.jatin.jobassistant.entity.ResumeFile;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.jatin.jobassistant.dto.ResumeResponse;
import com.jatin.jobassistant.dto.ResumeUploadResponse;
import com.jatin.jobassistant.entity.Resume;
import com.jatin.jobassistant.repository.ResumeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ResumeService {

	public static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

	// Every PDF file starts with these bytes
	private static final byte[] PDF_HEADER = "%PDF-".getBytes(StandardCharsets.US_ASCII);

	private final ResumeRepository resumeRepository;

	private final ResumeFileRepository resumeFileRepository;

	private final SkillCatalog skillCatalog;

	public ResumeUploadResponse upload(Long userId, MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new InvalidFileException("Please upload a PDF in the form-data field \"file\"");
		}
		if (file.getSize() > MAX_FILE_SIZE_BYTES) {
			throw new InvalidFileException("File is too large. Maximum allowed size is 5 MB");
		}

		byte[] bytes = readBytes(file);
		if (!isPdf(file.getOriginalFilename(), bytes)) {
			throw new InvalidFileException("Only PDF files are allowed");
		}

		Resume resume = new Resume();
		resume.setUserId(userId);
		resume.setFileName(file.getOriginalFilename());
		resume.setExtractedText(extractText(bytes));
		resume.setHasFile(true);
		Resume saved = resumeRepository.save(resume);
		// The PDF itself is kept too, so the resume can be shown as a picture of its first page
		resumeFileRepository.save(new ResumeFile(saved.getId(), bytes));
		return summary(saved);
	}

	public List<ResumeUploadResponse> list(Long userId) {
		return resumeRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId)
			.stream()
			.map(this::summary)
			.toList();
	}

	public ResumeResponse getById(Long userId, Long id) {
		// A resume of another user is reported as "not found", the same as one that does not exist
		return resumeRepository.findByIdAndUserId(id, userId)
			.map(ResumeResponse::from)
			.orElseThrow(() -> new ResumeNotFoundException(id));
	}

	// The uploaded PDF. Resumes that were uploaded before files were stored have none.
	public ResumeFileContent getFile(Long userId, Long id) {
		Resume resume = resumeRepository.findByIdAndUserId(id, userId).orElseThrow(() -> new ResumeNotFoundException(id));
		byte[] data = resumeFileRepository.findById(id).map(ResumeFile::getData).orElseThrow(() -> new ResumeNotFoundException(id));
		return new ResumeFileContent(resume.getFileName(), data);
	}

	public record ResumeFileContent(String fileName, byte[] data) {
	}

	private ResumeUploadResponse summary(Resume resume) {
		return ResumeUploadResponse.from(resume, skillCatalog.detect(resume.getExtractedText()));
	}

	private byte[] readBytes(MultipartFile file) {
		try {
			return file.getBytes();
		}
		catch (IOException ex) {
			throw new InvalidFileException("Could not read the uploaded file");
		}
	}

	// Checks the name and the real content, so a renamed .txt or .exe is rejected too
	private boolean isPdf(String fileName, byte[] bytes) {
		if (fileName == null || !fileName.toLowerCase().endsWith(".pdf") || bytes.length < PDF_HEADER.length) {
			return false;
		}
		for (int i = 0; i < PDF_HEADER.length; i++) {
			if (bytes[i] != PDF_HEADER[i]) {
				return false;
			}
		}
		return true;
	}

	private String extractText(byte[] bytes) {
		try (PDDocument document = Loader.loadPDF(bytes)) {
			String text = new PDFTextStripper().getText(document);
			// PostgreSQL text columns cannot store the NUL character
			return text.replace("\u0000", "").strip();
		}
		catch (IOException ex) {
			throw new InvalidFileException("Could not read the PDF. It may be corrupted or password protected");
		}
	}

}
