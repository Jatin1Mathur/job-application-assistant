package com.jatin.jobassistant.controller;

import java.util.Arrays;
import java.util.stream.Collectors;

import org.springframework.context.MessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import com.jatin.jobassistant.dto.ErrorResponse;
import com.jatin.jobassistant.service.AiTimeoutException;
import com.jatin.jobassistant.service.AiUnavailableException;
import com.jatin.jobassistant.service.ApplicationNotFoundException;
import com.jatin.jobassistant.service.DemoUnavailableException;
import com.jatin.jobassistant.service.EmailAlreadyUsedException;
import com.jatin.jobassistant.service.InvalidAiResponseException;
import com.jatin.jobassistant.service.InvalidAnalysisRequestException;
import com.jatin.jobassistant.service.InvalidCredentialsException;
import com.jatin.jobassistant.service.InvalidFileException;
import com.jatin.jobassistant.service.ResumeNotFoundException;

import tools.jackson.databind.exc.InvalidFormatException;

// Turns exceptions into JSON error responses for every controller
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler({ InvalidFileException.class, InvalidAnalysisRequestException.class })
	public ResponseEntity<ErrorResponse> handleInvalidRequest(RuntimeException ex) {
		return error(HttpStatus.BAD_REQUEST, ex.getMessage());
	}

	@ExceptionHandler({ ResumeNotFoundException.class, ApplicationNotFoundException.class })
	public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException ex) {
		return error(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(EmailAlreadyUsedException.class)
	public ResponseEntity<ErrorResponse> handleEmailAlreadyUsed(EmailAlreadyUsedException ex) {
		return error(HttpStatus.CONFLICT, ex.getMessage());
	}

	// The demo account is switched off or was not created yet
	@ExceptionHandler(DemoUnavailableException.class)
	public ResponseEntity<ErrorResponse> handleDemoUnavailable(DemoUnavailableException ex) {
		return error(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
	}

	// Wrong email or password at login
	@ExceptionHandler(InvalidCredentialsException.class)
	public ResponseEntity<ErrorResponse> handleInvalidCredentials(InvalidCredentialsException ex) {
		return error(HttpStatus.UNAUTHORIZED, ex.getMessage());
	}

	// Thrown by Spring itself when the upload is bigger than spring.servlet.multipart.max-file-size
	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<ErrorResponse> handleTooLarge(MaxUploadSizeExceededException ex) {
		return error(HttpStatus.CONTENT_TOO_LARGE, "File is too large. Maximum allowed size is 5 MB");
	}

	@ExceptionHandler(MultipartException.class)
	public ResponseEntity<ErrorResponse> handleNotMultipart(MultipartException ex) {
		return error(HttpStatus.BAD_REQUEST, "Please upload a PDF in the form-data field \"file\"");
	}

	@ExceptionHandler(HttpMediaTypeNotSupportedException.class)
	public ResponseEntity<ErrorResponse> handleWrongContentType(HttpMediaTypeNotSupportedException ex) {
		return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
				"Unsupported Content-Type. Use one of: " + ex.getSupportedMediaTypes());
	}

	// The AI server (Ollama) is not running or answered with an error
	@ExceptionHandler(AiUnavailableException.class)
	public ResponseEntity<ErrorResponse> handleAiUnavailable(AiUnavailableException ex) {
		return error(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
	}

	@ExceptionHandler(AiTimeoutException.class)
	public ResponseEntity<ErrorResponse> handleAiTimeout(AiTimeoutException ex) {
		return error(HttpStatus.GATEWAY_TIMEOUT, ex.getMessage());
	}

	// The AI answered, but not with the JSON we asked for
	@ExceptionHandler(InvalidAiResponseException.class)
	public ResponseEntity<ErrorResponse> handleInvalidAiResponse(InvalidAiResponseException ex) {
		return error(HttpStatus.BAD_GATEWAY, ex.getMessage());
	}

	@ExceptionHandler(MissingServletRequestParameterException.class)
	public ResponseEntity<ErrorResponse> handleMissingParameter(MissingServletRequestParameterException ex) {
		return error(HttpStatus.BAD_REQUEST, ex.getParameterName() + " is required");
	}

	// A @Valid request body failed its checks, e.g. companyName is blank
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleInvalidBody(MethodArgumentNotValidException ex) {
		String message = ex.getBindingResult()
			.getFieldErrors()
			.stream()
			.map(FieldError::getDefaultMessage)
			.sorted()
			.collect(Collectors.joining("; "));
		return error(HttpStatus.BAD_REQUEST, message);
	}

	// A request parameter failed its checks, e.g. size=0
	@ExceptionHandler(HandlerMethodValidationException.class)
	public ResponseEntity<ErrorResponse> handleInvalidParameter(HandlerMethodValidationException ex) {
		String message = ex.getAllErrors()
			.stream()
			.map(MessageSourceResolvable::getDefaultMessage)
			.distinct()
			.collect(Collectors.joining("; "));
		return error(HttpStatus.BAD_REQUEST, message);
	}

	// The JSON body is missing, broken, or holds a value that does not fit the field (e.g. an unknown status)
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
		if (ex.getCause() instanceof InvalidFormatException cause && cause.getTargetType().isEnum()) {
			return error(HttpStatus.BAD_REQUEST,
					"Invalid value '" + cause.getValue() + "'. " + allowedValues(cause.getTargetType()));
		}
		return error(HttpStatus.BAD_REQUEST, "Request body is missing or is not valid JSON");
	}

	// A path variable or query parameter could not be converted, e.g. id=abc or status=UNKNOWN
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ErrorResponse> handleBadParameter(MethodArgumentTypeMismatchException ex) {
		Class<?> type = ex.getRequiredType();
		if (type != null && type.isEnum()) {
			return error(HttpStatus.BAD_REQUEST,
					"Invalid value '" + ex.getValue() + "' for " + ex.getName() + ". " + allowedValues(type));
		}
		return error(HttpStatus.BAD_REQUEST, ex.getName() + " must be a number");
	}

	private String allowedValues(Class<?> enumType) {
		return "Allowed values: " + Arrays.stream(enumType.getEnumConstants())
			.map(Object::toString)
			.collect(Collectors.joining(", "));
	}

	private ResponseEntity<ErrorResponse> error(HttpStatus status, String message) {
		return ResponseEntity.status(status)
			.body(new ErrorResponse(status.value(), status.getReasonPhrase(), message));
	}

}
