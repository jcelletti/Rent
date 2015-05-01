﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Filters;

using Core;
using Core.Actions;
using Core.Classes;
using Web.Models;

namespace Web.ApiControllers
{
	[ApiExceptionFilter]
	public class ApiControllerBase : ApiController
	{
		public ApiControllerBase()
			: base()
		{
		}
	}

	public class ApiExceptionFilter : ExceptionFilterAttribute
	{
		public override void OnException(HttpActionExecutedContext context)
		{
			base.OnException(context);
		}
	}

	[RoutePrefix("Renter")]
	public class RenterController : ApiControllerBase
	{
		[HttpGet]
		[Route("")]
		public IHttpActionResult All()
		{
			return this.Ok(Database.GetAll<Renter>());
		}

		[HttpGet]
		[Route("{id:guid}")]
		public IHttpActionResult Get(Guid id)
		{
			return this.Ok(Database.Get<Renter>(id));
		}

		[HttpPost]
		[Route("")]
		public IHttpActionResult Add(Renter renter)
		{
			renter.Id = Guid.NewGuid();
			Database.Insert(renter);

			return this.Ok(Database.Get<Renter>(renter.Id));
		}

		[HttpPut]
		[Route("")]
		public IHttpActionResult Update(Renter renter)
		{
			//todo: check for no id
			Database.Update<Renter>(renter);

			return this.Ok(Database.Get<Renter>(renter.Id));
		}

		[HttpDelete]
		[Route("{id:guid}")]
		public IHttpActionResult Delete(Guid id)
		{
			Database.Delete<Renter>(id);
			return this.Ok();
		}
	}

	[RoutePrefix("Rent")]
	public class RentController : ApiControllerBase
	{
		[HttpGet]
		[Route("")]
		public IHttpActionResult All()
		{
			return this.Ok(Database.GetAll<Rent>().OrderBy(r => r.Month));
		}

		[HttpGet]
		[Route("{id:guid}/Validate")]
		public IHttpActionResult Validate(Guid id)
		{
			List<RentValidationModel> validated = new List<RentValidationModel>();

			IEnumerable<Receipt> receipts = Database.GetAllByRent<Receipt>(id);

			Dictionary<Guid, decimal> owed = new Dictionary<Guid, decimal>();

			foreach (var receipt in receipts)
			{
				this.ValidateReceipt(receipt);

				if (!owed.ContainsKey(receipt.Payer)) { owed.Add(receipt.Payer, 0); }

				IEnumerable<Payment> payments = Database.GetPaymentsByReceipt(receipt.Id);

				decimal pmtReduction = 0;

				foreach (var pmt in payments)
				{
					if (!owed.ContainsKey(pmt.Payer)) { owed.Add(pmt.Payer, 0); }

					if (pmt.Payer == receipt.Payer) { continue; }
					var payeeTotal = pmt.PaymentAmount + pmt.Tip + pmt.Tax;

					pmtReduction += payeeTotal;

					owed[pmt.Payer] += payeeTotal;
				}

				owed[receipt.Payer] -= pmtReduction;
			}

			decimal sum = 0;

			foreach (var key in owed.Keys)
			{
				Renter renter = Database.Get<Renter>(key);
				validated.Add(new RentValidationModel(key, renter.FullName, owed[key]));
				sum += owed[key];
			}

			if (sum != 0)
			{
				throw new InvalidRentSumException(validated);
			}

			return this.Ok(validated);
		}

		private void ValidateReceipt(Receipt receipt)
		{
			IEnumerable<Payment> payments = Database.GetPaymentsByReceipt(receipt.Id);

			decimal total = 0;
			decimal tip = 0;
			decimal tax = 0;

			foreach (var pmt in payments)
			{
				total += pmt.PaymentAmount;
				tip += pmt.Tip;
				tax += pmt.Tax;
			}

			tip = Math.Round(tip, 2);

			tax = Math.Round(tax, 2);

			total += tip + tax;

			total = Math.Round(total, 2);

			if (receipt.Total != total)
			{
				throw new InvalidTotalException(receipt, total);
			}
			if (receipt.Tip != tip)
			{
				throw new InvalidTipException(receipt, tip);
			}
			if (receipt.Tax != tax)
			{
				throw new InvalidTaxException(receipt, tax);
			}
		}

		[HttpPost]
		[Route("")]
		public IHttpActionResult Add()
		{
			var rent = new Rent
			{
				Id = Guid.NewGuid(),
				Name = "New Rent",
				Month = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1)
			};

			Database.Insert(rent);

			return this.Ok(Database.Get<Rent>(rent.Id));
		}

		[HttpPut]
		[Route("")]
		public IHttpActionResult Update(Rent rent)
		{
			Database.Update(rent);
			return this.Ok(Database.Get<Rent>(rent.Id));
		}

		[HttpDelete]
		[Route("{id:guid}")]
		public IHttpActionResult Delete(Guid id)
		{
			Database.Delete<Rent>(id);
			return this.Ok();
		}
	}

	[RoutePrefix("Receipt")]
	public class ReceiptController : ApiControllerBase
	{
		[HttpGet]
		[Route("")]
		public IHttpActionResult All()
		{
			return this.Ok(Database.GetAll<Receipt>().OrderBy(r => r.Date));
		}

		[HttpGet]
		[Route("{rentId:guid}/ByRent")]
		public IHttpActionResult GetByRent(Guid rentId)
		{
			return this.Ok(Database.GetAllByRent<Receipt>(rentId).OrderBy(r => r.Date));
		}

		[HttpGet]
		[Route("{id:guid}/Validate")]
		public IHttpActionResult Validate(Guid id)
		{
			Receipt receipt = Database.Get<Receipt>(id);

			this.ValidateReceipt(receipt);

			return this.Ok();
		}

		[HttpPost]
		[Route("{rentId:guid}")]
		public IHttpActionResult Add(Guid rentId)
		{
			var receipt = new Receipt
				{
					Id = Guid.NewGuid(),
					Name = "New Receipt",
					Date = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1),
					Tip = 0,
					Total = 0,
					Payer = Database.First<Renter>().Id,
					RentId = (rentId == Guid.Empty) ? Database.First<Rent>().Id : rentId
				};

			Database.Insert(receipt);

			return this.Ok(Database.Get<Receipt>(receipt.Id));
		}

		[HttpPut]
		[Route("")]
		public IHttpActionResult Update(Receipt receipt)
		{
			Database.Update(receipt);
			return this.Ok(Database.Get<Receipt>(receipt.Id));
		}

		[HttpDelete]
		[Route("{id:guid}")]
		public IHttpActionResult Delete(Guid id)
		{
			Database.Delete<Receipt>(id);
			return this.Ok();
		}

		private void ValidateReceipt(Receipt receipt)
		{
			IEnumerable<Payment> payments = Database.GetPaymentsByReceipt(receipt.Id);

			decimal total = 0;
			decimal tip = 0;
			decimal tax = 0;

			foreach (var pmt in payments)
			{
				total += pmt.PaymentAmount;
				tip += pmt.Tip;
				tax += pmt.Tax;
			}

			tip = Math.Round(tip, 2);

			tax = Math.Round(tax, 2);

			total += tip + tax;

			total = Math.Round(total, 2);

			if (receipt.Total != total)
			{
				throw new InvalidTotalException(receipt, total);
			}
			if (receipt.Tip != tip)
			{
				throw new InvalidTipException(receipt, tip);
			}
			if (receipt.Tax != tax)
			{
				throw new InvalidTaxException(receipt, tax);
			}
		}
	}

	[RoutePrefix("Payment")]
	public class PaymentController : ApiControllerBase
	{
		[HttpGet]
		[Route("")]
		public IHttpActionResult All()
		{
			return this.Ok(Database.GetAll<Payment>().OrderBy(p => p.Payer));
		}

		[HttpGet]
		[Route("{rentId:guid}/ByRent")]
		public IHttpActionResult ByRent(Guid rentId)
		{
			return this.Ok(Database.GetAllByRent<Payment>(rentId));
		}

		[HttpGet]
		[Route("{receiptId:guid}/ByReceipt")]
		public IHttpActionResult ByReceipt(Guid receiptId)
		{
			return this.Ok(Database.GetPaymentsByReceipt(receiptId));
		}

		[HttpPost]
		[Route("{receiptId:guid}")]
		public IHttpActionResult Add(Guid receiptId)
		{
			var payment = new Payment
			{
				Id = Guid.NewGuid(),
				PaymentAmount = 0,
				Tip = 0,
				Tax = 0,
				ReceiptId = receiptId,
				Payer = Database.First<Renter>().Id
			};

			payment.Payer = Database.First<Renter>().Id;
			Database.Insert(payment);

			return this.Ok(Database.Get<Payment>(payment.Id));
		}

		[HttpDelete]
		[Route("{id:guid}")]
		public IHttpActionResult Delete(Guid id)
		{
			Database.Delete<Payment>(id);
			return this.Ok();
		}
	}
}