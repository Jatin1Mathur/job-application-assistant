package com.jatin.jobassistant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import com.jatin.jobassistant.dto.ApplicationResponse;
import com.jatin.jobassistant.dto.CreateApplicationRequest;
import com.jatin.jobassistant.dto.PageResponse;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;
import com.jatin.jobassistant.repository.JobApplicationRepository;

@ExtendWith(MockitoExtension.class)
class JobApplicationServiceTest {

	@Mock
	private JobApplicationRepository jobApplicationRepository;

	@InjectMocks
	private JobApplicationService jobApplicationService;

	@Test
	void createSavesApplicationWithStatusSaved() {
		when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(invocation -> {
			JobApplication saved = invocation.getArgument(0);
			saved.setId(1L);
			saved.setCreatedAt(Instant.now());
			saved.setUpdatedAt(Instant.now());
			return saved;
		});

		ApplicationResponse response = jobApplicationService
			.create(new CreateApplicationRequest(" Acme ", "Java Developer", "Build APIs"));

		assertThat(response.id()).isEqualTo(1L);
		assertThat(response.companyName()).isEqualTo("Acme");
		assertThat(response.jobTitle()).isEqualTo("Java Developer");
		assertThat(response.jobDescription()).isEqualTo("Build APIs");
		assertThat(response.status()).isEqualTo(ApplicationStatus.SAVED);
	}

	@Test
	void listWithoutStatusReturnsAllNewestFirst() {
		when(jobApplicationRepository.findAll(any(Pageable.class))).thenAnswer(invocation -> new PageImpl<>(
				List.of(application(2L, ApplicationStatus.APPLIED), application(1L, ApplicationStatus.SAVED)),
				invocation.getArgument(0), 5));

		PageResponse<ApplicationResponse> response = jobApplicationService.list(null, 0, 2);

		assertThat(response.content()).extracting(ApplicationResponse::id).containsExactly(2L, 1L);
		assertThat(response.page()).isZero();
		assertThat(response.size()).isEqualTo(2);
		assertThat(response.totalElements()).isEqualTo(5);
		assertThat(response.totalPages()).isEqualTo(3);

		ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
		verify(jobApplicationRepository).findAll(pageable.capture());
		assertThat(pageable.getValue().getSort().getOrderFor("createdAt").getDirection())
			.isEqualTo(Sort.Direction.DESC);
	}

	@Test
	void listWithStatusFiltersByStatus() {
		when(jobApplicationRepository.findByStatus(eq(ApplicationStatus.APPLIED), any(Pageable.class)))
			.thenReturn(new PageImpl<>(List.of(application(2L, ApplicationStatus.APPLIED)), PageRequest.of(1, 10),
					11));

		PageResponse<ApplicationResponse> response = jobApplicationService.list(ApplicationStatus.APPLIED, 1, 10);

		assertThat(response.content()).hasSize(1);
		assertThat(response.content().get(0).status()).isEqualTo(ApplicationStatus.APPLIED);
		assertThat(response.page()).isEqualTo(1);
		verify(jobApplicationRepository, never()).findAll(any(Pageable.class));
	}

	@Test
	void getByIdReturnsApplication() {
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));

		assertThat(jobApplicationService.getById(7L).id()).isEqualTo(7L);
	}

	@Test
	void getByIdThrowsWhenApplicationDoesNotExist() {
		when(jobApplicationRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.getById(99L)).isInstanceOf(ApplicationNotFoundException.class)
			.hasMessageContaining("99");
	}

	@Test
	void updateStatusChangesOnlyTheStatus() {
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(invocation -> invocation.getArgument(0));

		ApplicationResponse response = jobApplicationService.updateStatus(7L, ApplicationStatus.INTERVIEW);

		assertThat(response.status()).isEqualTo(ApplicationStatus.INTERVIEW);
		assertThat(response.companyName()).isEqualTo("Company 7");
	}

	@Test
	void updateStatusThrowsWhenApplicationDoesNotExist() {
		when(jobApplicationRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.updateStatus(99L, ApplicationStatus.APPLIED))
			.isInstanceOf(ApplicationNotFoundException.class);
		verify(jobApplicationRepository, never()).save(any());
	}

	@Test
	void deleteRemovesApplication() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application));

		jobApplicationService.delete(7L);

		verify(jobApplicationRepository).delete(application);
	}

	@Test
	void deleteThrowsWhenApplicationDoesNotExist() {
		when(jobApplicationRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.delete(99L)).isInstanceOf(ApplicationNotFoundException.class);
		verify(jobApplicationRepository, never()).delete(any());
	}

	private JobApplication application(Long id, ApplicationStatus status) {
		JobApplication application = new JobApplication();
		application.setId(id);
		application.setCompanyName("Company " + id);
		application.setJobTitle("Developer");
		application.setStatus(status);
		application.setCreatedAt(Instant.now());
		application.setUpdatedAt(Instant.now());
		return application;
	}

}
