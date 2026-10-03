package com.jatin.jobassistant.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import com.jatin.jobassistant.dto.ErrorResponse;
import com.jatin.jobassistant.service.InvalidFileException;
import com.jatin.jobassistant.service.ResumeNotFoundException;

// Turns exceptions into JSON error responses for every controller
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(InvalidFileException.class)
	public ResponseEntity<ErrorResponse> handleInvalidFile(InvalidFileException ex) {
		return error(HttpStatus.BAD_REQUEST, ex.getMessage());
	}

	@ExceptionHandler(ResumeNotFoundException.class)
	public ResponseEntity<ErrorResponse> handleNotFound(ResumeNotFoundException ex) {
		return error(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	// Thrown by Spring itself when the upload is bigger than spring.servlet.multipart.max-file-size
	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<ErrorResponse> handleTooLarge(MaxUploadSizeExceededException ex) {
		return error(HttpStatus.CONTENT_TOO_LARGE, "File is too large. Maximum allowed size is 5 MB");
	}

	@ExceptionHandler({ MultipartException.class, HttpMediaTypeNotSupportedException.class })
	public ResponseEntity<ErrorResponse> handleNotMultipart(Exception ex) {
		return error(HttpStatus.BAD_REQUEST, "Please upload a PDF in the form-data field \"file\"");
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ErrorResponse> handleBadId(MethodArgumentTypeMismatchException ex) {
		return error(HttpStatus.BAD_REQUEST, "Resume id must be a number");
	}

	private ResponseEntity<ErrorResponse> error(HttpStatus status, String message) {
		return ResponseEntity.status(status)
			.body(new ErrorResponse(status.value(), status.getReasonPhrase(), message));
	}

}
