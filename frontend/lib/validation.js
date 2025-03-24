import Joi from "joi"

export function validateLogin(data) {
  const schema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": "Please enter a valid email address",
        "string.empty": "Email is required",
      }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters",
      "string.empty": "Password is required",
    }),
  })

  return schema.validate(data, { abortEarly: false })
}

export function validateSignup(data) {
  const schema = Joi.object({
    name: Joi.string().required().messages({
      "string.empty": "Name is required",
    }),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": "Please enter a valid email address",
        "string.empty": "Email is required",
      }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters",
      "string.empty": "Password is required",
    }),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
      "any.only": "Passwords do not match",
      "string.empty": "Please confirm your password",
    }),
  })

  return schema.validate(data, { abortEarly: false })
}

export function validateProfileUpdate(data) {
  const schema = Joi.object({
    name: Joi.string().required().messages({
      "string.empty": "Name is required",
    }),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": "Please enter a valid email address",
        "string.empty": "Email is required",
      }),
  })

  return schema.validate(data, { abortEarly: false })
}

