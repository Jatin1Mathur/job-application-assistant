package com.jatin.jobassistant.config;

import java.util.Locale;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

import com.jatin.jobassistant.entity.CoverLetterTone;

// Lets the request say tone=friendly as well as tone=FRIENDLY
@Component
public class CoverLetterToneConverter implements Converter<String, CoverLetterTone> {

	@Override
	public CoverLetterTone convert(String source) {
		return CoverLetterTone.valueOf(source.strip().toUpperCase(Locale.ROOT));
	}

}
