/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
import React, { useCallback, useEffect } from "react"
import { type VisitOptions } from "@inertiajs/core"
import useInertiaForm, { NestedObject } from "../useInertiaForm"
import { useForm, type UseFormProps, type HTTPVerb, FormProvider } from "./FormProvider"
import FormMetaWrapper, { useFormMeta, type FormMetaValue } from "./FormMetaWrapper"
import { unsetCompact } from "../utils"

type PartialHTMLForm = Omit<React.FormHTMLAttributes<HTMLFormElement>, "onChange" | "onSubmit" | "onError">

export interface FormProps<TForm> extends PartialHTMLForm {
	data?: TForm
	model?: string
	method?: HTTPVerb
	to: string
	async?: boolean
	resetAfterSubmit?: boolean
	preserveState?: boolean
	remember?: boolean
	railsAttributes?: boolean
	filter?: string[]
	onChange?: (form: UseFormProps<TForm>) => void
	onSubmit?: (form: UseFormProps<TForm>) => boolean | void
	onBefore?: (form: UseFormProps<TForm>) => void
	onStart?: (form: UseFormProps<TForm>) => void
	onSuccess?: (form: UseFormProps<TForm>) => void
	onError?: (form: UseFormProps<TForm>) => void
	onFinish?: (form: UseFormProps<TForm>) => void
}

const Form = <TForm extends NestedObject>({
	children,
	model,
	data,
	method = "post",
	to,
	async = false,
	preserveState = true,
	resetAfterSubmit,
	remember = true,
	filter,
	onChange,
	onSubmit,
	onBefore,
	onStart,
	onSuccess,
	onError,
	onFinish,
	...props
}: Omit<FormProps<TForm>, "railsAttributes">) => {
	/**
	 * Omit values by key from the data object
	 */
	const filteredData = useCallback((data: TForm) => {
		if(!filter) return data

		const clone = structuredClone(data)
		filter.forEach(path => {
			unsetCompact(clone, path)
		})
		return clone
	}, [data, filter])

	const form = remember ?
		useInertiaForm<TForm>(`${method}/${model || to}`, filteredData(data))
		:
		useInertiaForm<TForm>(filteredData(data))

	const contextValueObject = useCallback((): UseFormProps<TForm> => (
		{ ...form, model, method, to, submit }
	), [data, form, form.data, form.errors, model, method, to])
	/**
	 * Submits the form. If async prop is true, submits using axios,
	 * otherwise submits using Inertia's `useForm.submit` method
	 */
	const submit = async(options?: Partial<VisitOptions>) => {
		let shouldSubmit = to && onSubmit?.(contextValueObject()) === false ? false : true

		if(!shouldSubmit) return

		return form.submit(method, to, { ...options, async: async === true ? true : false })
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		e.stopPropagation()

		const submitOptions: Partial<VisitOptions> = {
			preserveState,
			onSuccess: () => {
				if(resetAfterSubmit || (resetAfterSubmit !== false && async === true)) {
					form.reset()
				}
				onSuccess?.(contextValueObject())
			},
		}
		if(onBefore) {
			submitOptions.onBefore = () => {
				onBefore(contextValueObject())
			}
		}
		if(onStart) {
			submitOptions.onStart = () => {
				onStart(contextValueObject())
			}
		}
		if(onFinish) {
			submitOptions.onFinish = () => {
				onFinish(contextValueObject())
			}
		}

		submit(submitOptions)
	}

	// Set values from url search params. Allows for prefilling form data from a link
	useEffect(() => {
		const url = new URL(window.location.href)
		url.searchParams.forEach((value, key) => {
			form.setData(key, value)
		})
	}, [])

	// Callbacks
	useEffect(() => {
		onChange?.(contextValueObject())
	}, [form.data])

	useEffect(() => {
		onError?.(contextValueObject())
	}, [form.errors])

	return (
		<FormProvider value={ contextValueObject() }>
			<form onSubmit={ handleSubmit } { ...props }>
				{ children }
			</form>
		</FormProvider>
	)
}

const WrappedForm = <TForm extends Partial<NestedObject>>(
	{ children, model, railsAttributes = false, ...props }: FormProps<TForm>,
) => {
	return (
		<FormMetaWrapper model={ model } railsAttributes={ railsAttributes }>
			<Form<TForm> model={ model } { ...props }>
				{ children }
			</Form>
		</FormMetaWrapper>
	)
}

export {
	WrappedForm as Form,
	useForm,
	useFormMeta,
	type HTTPVerb,
	type UseFormProps,
	type FormMetaValue,
}
