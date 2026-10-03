package com.jatin.jobassistant.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

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

	public ResumeUploadResponse upload(MultipartFile file) {
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
		resume.setFileName(file.getOriginalFilename());
		resume.setExtractedText(extractText(bytes));
		return ResumeUploadResponse.from(resumeRepository.save(resume));
	}

	public ResumeResponse getById(Long id) {
		return resumeRepository.findById(id)
			.map(ResumeResponse::from)
			.orElseThrow(() -> new ResumeNotFoundException(id));
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
