﻿'use strict';
var SPA = function () {
	var appPath = '/';

	return {
		AppPath: function (path) {
			if (!!path) {
				appPath = path;
			};

			return appPath;
		},
		Template: function (name, folder) {

			var path = appPath + 'NgTemplates/';

			if (!!folder) {
				path += folder + '/';
			};

			return path + name + '.html';
		},
		AssignDataWatch: function (scope, element, callback) {
			var watcher = scope.$watch('row.Data', function (newData) {
				callback(newData[scope.column.Binding]);
			}, true);

			element.on('$destroy', function () {
				watcher();
			});
		}
	};
}();

SPA.Config = function () {
	return {
		DataTypes: {
			string: 'string',
			Date: 'date',
			Time: 'time',
			DateTime: 'dateTime',
			Currency: 'currency',
			Renters: 'renters',
			Rents: 'rents'
		},
		DateFormats: {
			Day: 'MMMM DD, YYYY',
			Month: 'MMMM YYYY',
			Year: 'YYYY'
		},
		DataTypeIsDate: function (dt) {
			return dt === SPA.Config.DataTypes.Date ||
				dt === SPA.Config.DataTypes.Time ||
				dt === SPA.Config.DataTypes.DateTime;
		}
	};
}();

angular.module('SPA', ['SPA.Extensions', 'SPA.Data.Grid'])
	.directive('spaMain', [
		'spaModals', 'Renters', 'Rents', 'spaLocation',
		function (modals, renters, rents, lm) {
			return {
				restrict: 'A',
				replace: false,
				transclude: false,
				controller: [
					'$scope',
					function ($scope) {
					}
				],
				compile: function () {
					return {
						pre: function (scope, element) {
							scope.Contents = {
								Template: null,
								RentsLoaded: false,
								RentersLoaded: false
							};

							renters.Set(function () {
								scope.Contents.RentersLoaded = true;
							});

							rents.Set(function () {
								scope.Contents.RentsLoaded = true;
							});

							lm.Initialize(scope, element, function (template) {
								scope.Contents.Template = 'spa-' + template;
							});
						},
						post: function (scope) {
						}
					};
				}
			};
		}
	])
	.directive('spaRents', [
		'Rents', 'dgConfiguration', 'dgColumn', 'dgFunction', 'spaLocation',
		function (rents, Config, Column, Function, lm) {
			return {
				restrict: 'E',
				replace: true,
				transclude: true,
				compile: function () {
					return {
						pre: function (scope) {
							scope.Contents = {
								Rents: rents.Get(),
								Config: new Config({
									columns: [
										new Column({
											title: 'Month',
											binding: 'Date',
											visible: true,
											dataType: SPA.Config.DataTypes.Date,
											dateFormat: SPA.Config.DateFormats.Month
										})
									],
									globalActions: {
										'Go to Renters': function () {
											lm.SetLocation(lm.Pages.renters);
										},
										'Add': function () {
											rents.Add(function (rents) {
												scope.Rents = rents;
											});
										}
									},
									rowActions: {
										'Go To': [
											new Function('Receipts', function (row) {
												console.log(row.Data.Id);
												//return;
												lm.SetParam(lm.Parameters.rent, row.Data.Id);
												lm.SetLocation(lm.Pages.reciepts);
											}),
											new Function('Payments', function (row) {
												lm.SetParam(lm.Parameters.rent, row.Data.Id);
												lm.SetLocation(lm.Pages.payments);
											})
										],
										'Actions': [
											new Function('Validate', function (row) {
												rents.Validate(row.Data.Id)
													.then(function (res) {
														//todo: modal saying who owes what
														console.log(res);
													});
											}),
											new Function('Delete', function (row) {
												rents.Delete(row.Data.Id, function (rents) {
													scope.Contents.Rents = rents;
												});
											})
										]
									},
									save: function (row) {
										rents.Save(row.Data);
									}
								})
							};
						}
					};
				},
				templateUrl: SPA.Template('spa-rents'),
				scope: {
				}
			};
		}
	])
	.directive('spaReceipts', [
		'Receipts', 'Rents', 'dgConfiguration', 'dgColumn', 'dgFunction', 'spaLocation',
		function (receipts, rents, Config, Column, Function, lm) {
			return {
				restrict: 'E',
				replace: true,
				transclude: true,
				compile: function () {
					var rentId = null;
					return {
						pre: function (scope) {
							var rentId = lm.GetParam(lm.Parameters.rent);

							scope.Contents = {
								Receipts: [],
								Config: new Config({
									save: function (row) {
										receipts.Save(row.Data);
									},
									columns: [
										new Column({
											binding: 'Name',
											visible: true
										}),
										new Column({
											title: 'Date',
											binding: 'Date',
											visible: true,
											dataType: SPA.Config.DataTypes.Date,
											dateFormat: SPA.Config.DateFormats.Day
										}),
										new Column({
											binding: 'Tip',
											dataType: SPA.Config.DataTypes.Currency,
											visible: true
										}),
										new Column({
											binding: 'Tax',
											dataType: SPA.Config.DataTypes.Currency,
											visible: true
										}),
										new Column({
											binding: 'Total',
											dataType: SPA.Config.DataTypes.Currency,
											visible: true
										}),
										new Column({
											binding: 'Payer',
											dataType: SPA.Config.DataTypes.Renters,
											visible: true
										})
									],
									globalActions: {
										Add: function () {
											if (!rentId) {
												alert('need to select a rent to go to');
												return;
											};
											receipts.Add(rentId)
												.then(function (rec) {
													scope.Contents.Receipts.push(rec);
												});
										},
										'Validate Rent': function () {
											if (!rentId) {
												alert('need to select a rent to go to');
												return;
											};

											rents.Validate(rentId)
												.then(function (res) {
													console.log(res);
												});
										}
									},
									rowActions: {
										'Go To': [
											new Function('Payments', function (row) {
												lm.SetParam(lm.Parameters.receipt, row.Data.Id);
												lm.SetLocation(lm.Pages.payments);
											}),
										],
										'Actions': [
											new Function('Validate', function (row) {
												receipts.Validate(row.Data.Id)
													.then(function (res) {
														console.log(res);
													});
											}),
											new Function('Delete', function (row) {
												receipts.Delete(row.Data.Id)
													.then(function (res) {
														//todo: remove from list
													});
											})
										]
									}
								})
							};

							receipts.Get(rentId)
								.then(function (receipts) {
									scope.Contents.Receipts = receipts;
								});
						}
					};
				},
				templateUrl: SPA.Template('spa-receipts'),
				scope: {}
			};
		}
	])
	.directive('spaPayments', [
		'Payments', 'Receipts', 'dgConfiguration', 'dgColumn', 'dgFunction', 'spaLocation',
		function (payments, receipts, Config, Column, Function, lm) {
			return {
				restrict: 'E',
				replace: true,
				transclude: true,
				compile: function () {

					var receiptId = null;
					var rentId = null;

					return {
						pre: function (scope) {
							receiptId = lm.GetParam(lm.Parameters.receipt)
							rentId = lm.GetParam(lm.Parameters.rent);

							scope.Contents = {
								Payments: [],
								Config: new Config({
									columns: [
										new Column({
											binding: 'Tip',
											dataType: SPA.Config.DataTypes.Currency,
											visible: true
										}),
										new Column({
											binding: 'Tax',
											dataType: SPA.Config.DataTypes.Currency,
											visible: true
										}),
										new Column({
											title: 'Total',
											binding: 'Amount',
											dataType: SPA.Config.DataTypes.Currency,
											visible: true
										}),
										new Column({
											title: 'Payer',
											binding: 'Payer',
											dataType: SPA.Config.DataTypes.Renters,
											visible: true
										})
										//todo: add columns with rent receipt visibility
									],
									globalActions: {
										Add: function () {
											payments.Add(receiptId)
												.then(function (pmt) {
													scope.Contents.Payments.push(pmt);
												});
										},
										'Validate Receipt': function () {
											if (!receiptId) {
												console.error('receiptId not set')
											};

											receipts.Validate(receiptId)
												.then(function (res) {
													console.log(res);
												});
										}
									},
									rowActions: {
										Actions: [
											new Function('Delete', function (row) {
												payments.Delete(row.Data.Id, function (rents) {
													scope.Contents.Rents = rents;
												});
											})
										]
									}
								}),
							};

							//todo: add remove functions from config based on receiptId being set

							payments.Get(receiptId, rentId)
								.then(function (payments) {
									scope.Contents.Payments = payments;
								});
						}
					};
				},
				templateUrl: SPA.Template('spa-payments'),
				scope: {}
			}
		}
	])
	.service('spaLocation', [
		'$location',
		function ($location) {
			var svc = this;

			//todo: add breadcrumbs

			var pages = {
				rents: 'rents',
				reciepts: 'receipts',
				payments: 'payments',
				renters: 'renters'
			};

			svc.Pages = pages;

			svc.Parameters = {
				rent: 'rent-id',
				receipt: 'reciept-id'
			};

			var pageHash = {};

			$.each(pages, function (key, val) {
				pageHash[key] = '/' + val;
			});

			var currentLocation = function () {
				switch ($location.path()) {
					case pageHash.reciepts:
						return pages.reciepts;
					case pageHash.payments:
						return pages.payments;
					case pageHash.renters:
						return pages.renters;
					case pageHash.rents:
					default:
						return pages.rents;
				}
			};

			var pageToLocation = function (page) {
				switch (page) {
					case pages.reciepts:
						return pageHash.reciepts;
					case pages.payments:
						return pageHash.payments;
					case pages.renters:
						return pageHash.renters;
					case pages.rents:
					default:
						return pageHash.rents;
				}
			};

			var getPage = function (template, text) {
				return {
					template: template,
					text: text
				};
			};

			svc.PageButtons = function () {
				return [
					getPage(pageHash.rents),
					getPage(pageHash.reciepts),
					getPage(pageHash.payments)
				];
			};

			svc.Initialize = function (scope, element, templateChangeCallback) {
				var onWatch = scope.$on('$locationChangeSuccess', function () {
					scope.Contents.loading = true;
					templateChangeCallback(currentLocation());
				});

				element.on('$destroy', function () {
					onWatch();
				});

				$location.path(currentLocation());
			};

			svc.SetLocation = function (tabName) {
				$location.path(pageToLocation(tabName));
			};

			svc.SetParam = function (key, value) {
				var trimVal = $.trim(value);

				var hash = $location.search();
				if (trimVal.length === 0) {
					hash[key] = null;
				} else {
					hash[key] = trimVal;
				};

				$location.search(hash);
			};

			svc.GetParam = function (key) {
				return $location.search()[key];
			};
		}
	]);

angular.module('SPA.models', [])
	.factory('Renter',
		function () {
			return function (renter) {
				var r = this;

				r.Id = renter.id;

				r.First = renter.first;
				r.Last = renter.last;

				r.FullName = renter.fullName;
			}
		})
	.factory('Rent',
		function () {
			return function (rent) {
				var r = this;

				r.Id = rent.id;
				r.Name = rent.name
				r.Date = new moment(rent.month);
			}
		})
	.factory('Receipt',
		function () {
			return function (receipt) {
				var r = this;

				r.Id = receipt.id;
				r.RentId = receipt.rentId;

				r.Name = receipt.name;
				r.Date = new moment(receipt.date);
				r.Tip = receipt.tip;
				r.Tax = receipt.tax;
				r.Total = receipt.total;
				r.Payer = receipt.payer;
			}
		})
	.factory('Payment',
		function () {
			return function (payment) {
				var p = this;

				p.Id = payment.id;
				p.ReceiptId = payment.receiptId;

				p.Payer = payment.payer;
				p.Tax = payment.tax;
				p.Tip = payment.tip;
				p.Amount = payment.paymentAmount;
			};
		});

angular.module('SPA.Extensions', ['ui.bootstrap', 'SPA.HTTP'])
	.service('spaModals', [
		'$modal',
		function ($modal) {
			var svc = this;
		}
	])
	.service('Renters', [
		'HttpGet',
		function (get) {
			var renters = [];
			var hash = {};

			var reset = function (callback) {
				get.Renters()
					.then(function (result) {
						renters = result;

						hash = {};

						$.each(renters, function (i, r) {
							hash[r.Id] = r;
						});


						if ($.isFunction(callback)) {
							callback(renters);
						};
					});
			};

			return {
				Set: function (callback) {
					reset(callback);
				},
				Get: function () {
					return renters;
				},
				GetHash: function () {
					return hash;
				}
			};
		}
	])
	.service('Rents', [
		'HttpGet', 'HttpPost', 'HttpPut', 'HttpDelete', 'HttpValidate',
		function (get, post, put, httpDelete, validate) {
			var rents = [];

			var reset = function (callback) {
				get.Rents()
					.then(function (result) {
						rents = result;

						if ($.isFunction(callback)) {
							callback(rents);
						};
					});
			};

			return {
				Set: function (callback) {
					reset(callback);
				},
				Get: function () {
					return rents;
				},
				Add: function (callback) {
					post.Rent()
						.then(function (result) {
							rents.push(result);

							if ($.isFunction(callback)) {
								callback(rents);
							};
						});
				},
				Delete: function (id, callback) {
					httpDelete.Rent(id)
						.then(function () {
							reset(callback);
						});
				},
				Validate: function (id, callback) {
					return validate.Rent(id);
				},
				Save: function (rent) {
					put.Rent({
						id: rent.Id,
						month: rent.Date.toISOString(),
						name: rent.Name
					});
				}
			};
		}
	])
	.service('Receipts', [
		'HttpGet', 'HttpPost', 'HttpPut', 'HttpDelete', 'HttpValidate',
		function (get, post, put, httpDelete, validate) {
			return {
				Get: function (rentId) {
					return get.Receipts(rentId);
				},
				Add: function (rentId) {
					return post.Receipt(rentId);
				},
				Delete: function (receiptId) {
					return httpDelete.Receipt(receiptId);
				},
				Validate: function (receiptId) {
					return validate.Receipt(receiptId);
				},
				Save: function (receipt) {
					return put.Receipt({
						id: receipt.Id,
						rentId: receipt.RentId,
						name: receipt.Name,
						date: receipt.Date.toISOString(),
						tip: receipt.Tip,
						tax: receipt.Tax,
						total: receipt.Total,
						payer: receipt.Payer
					});
				}
			};
		}
	])
	.service('Payments', [
		'HttpGet', 'HttpPost', 'HttpPut', 'HttpDelete', 'HttpValidate',
		function (get, post, put, httpDelete, validate) {
			return {
				Get: function (receiptId, rentId) {
					return get.Payments(receiptId, rentId);
				},
				Add: function (receiptId) {
					return post.Payment(receiptId);
				},
				Delete: function (paymentId) {
					return httpDelete.Payment(paymentId);
				},
				Save: function (payment) {
					return put.Payments(payment);
				}
			};
		}
	])

	.directive('spaDynamic', [
		'$compile',
		function ($compile) {
			var camelCaseToHyphen = function (string) {
				return string.replace(/\W+/g, '-')
					.replace(/([a-z\d])([A-Z])/g, '$1-$2');
			};

			return {
				restrict: 'AE',
				replace: true,
				transclude: true,
				compile: function () {
					return {
						pre: function (scope, element) {
							var watcher = scope.$watch('template', function (newTemplate) {
								if (!newTemplate) {
									element.empty();
									return;
								};

								var hashString = '';

								$.each(scope.hash || {}, function (key, val) {
									hashString += camelCaseToHyphen(key) + '="hash.' + key + '" ';
								});

								var newEl = $('<' + newTemplate + ' ' + hashString + '></' + newTemplate + '>');

								element.html($compile(newEl)(scope));
							});

							element.on('$destroy', function () {
								watcher();
							});
						}
					}
				},
				scope: {
					template: '=',
					hash: '='
				}
			};
		}
	])
	.directive('spaAttrs',
		function () {
			return {
				restrict: 'A',
				replace: false,
				transclude: false,
				compile: function () {
					return {
						pre: function (scope, element) {
							$.each(scope.attrs, function (key, val) {
								element.attr(key, val);
							});
						}
					};
				},
				scope: {
					attrs: '=spaAttrs'
				}
			};
		});

angular.module('SPA.HTTP', ['ui.bootstrap', 'SPA.models'])
	.config([
		'$httpProvider',
		function ($httpProvider) {
			$httpProvider.interceptors.push([
				'$q',
				function ($q) {
					return {
						requestError: function (r) {
							console.log(r);
							return $q.reject(r);
						},
						responseError: function (r) {
							return $q.reject(r);
						}
					};
				}
			]);
		}
	])
	.factory('HttpDefer', [
		'$q', '$log',
		function ($q, $log) {
			return function (httpCallback, resolver, errorCallback) {
				var def = $q.defer();

				httpCallback(def)
					.success(function (response) {

						if (!!resolver) {

							if ($.isArray(response)) {
								var outArr = [];

								$.each(response, function (i, r) {
									outArr.push(new resolver(r));
								});

								def.resolve(outArr);
								return;
							};

							def.resolve(new resolver(response));
						}

						def.resolve(response);
					})
					.error(function (error, status, headers, requestData) {
						def.reject(error);
					});

				def.promise.catch(function (error) {
					$log.error(error);
				});

				return def.promise;
			};
		}
	])
	.service('HttpGet', [
		'$http', 'HttpDefer', 'Renter', 'Rent', 'Receipt', 'Payment',
		function ($http, Defer, Renter, Rent, Receipt, Payment) {
			var svc = this;

			svc.Renters = function () {
				return new Defer(function () {
					return $http.get('Renter');
				}, Renter);
			};

			svc.Rents = function () {
				return new Defer(function () {
					return $http.get('Rent');
				}, Rent);
			};

			svc.Receipts = function (rentId) {
				return new Defer(function () {
					var url = 'Receipt';

					var tRentId = $.trim(rentId);

					if (tRentId.length > 0) {
						url += '/' + tRentId + '/ByRent';
					};

					return $http.get(url);
				}, Receipt)
			};

			svc.Payments = function (receiptId, rentId) {
				return new Defer(function () {
					var url = 'Payment';

					var tReceiptId = $.trim(receiptId);
					var tRentId = $.trim(rentId);

					if (tReceiptId.length > 0) {
						url += '/' + tReceiptId + '/ByReceipt';
					} else if (tRentId.length > 0) {
						url += '/' + tRentId + '/ByRent';
					};

					return $http.get(url);
				}, Payment);
			};
		}
	])
	.service('HttpPost', [
		'$http', 'HttpDefer', 'Rent', 'Receipt', 'Payment',
		function ($http, Defer, Rent, Receipt, Payment) {
			var svc = this;

			svc.Rent = function () {
				return new Defer(function () {
					return $http.post('Rent');
				}, Rent);
			};

			svc.Receipt = function (rentId) {
				return new Defer(function () {
					return $http.post('Receipt/' + rentId);
				}, Receipt);
			};

			svc.Payment = function (receiptId) {
				return new Defer(function () {
					return $http.post('Payment/' + receiptId);
				}, Payment);
			};
		}
	])
	.service('HttpPut', [
		'$http', 'HttpDefer',
		function ($http, Defer) {
			var svc = this;

			svc.Rent = function (r) {
				return new Defer(function () {
					return $http.put('Rent', r);
				});
			};

			svc.Receipt = function (r) {
				return new Defer(function () {
					return $http.put('Receipt', r);
				});
			};
		}
	])
	.service('HttpDelete', [
		'$http', 'HttpDefer',
		function ($http, Defer) {
			var svc = this;

			svc.Rent = function (id) {
				return new Defer(function () {
					return $http.delete('Rent/' + id);
				});
			};

			svc.Receipt = function (id) {
				return new Defer(function () {
					return $http.delete('Receipt/' + id)
				});
			};

			svc.Payment = function (id) {
				return new Defer(function () {
					return $http.delete('Payment/' + id);
				});
			};
		}
	])
	.service('HttpValidate', [
		'$http', 'HttpDefer',
		function ($http, Defer) {
			var svc = this;

			svc.Rent = function (id) {
				return new Defer(function () {
					return $http.get('Rent/' + id + '/Validate');
				});
			};

			svc.Receipt = function (id) {
				return new Defer(function () {
					return $http.get('Receipt/' + id + '/Validate');
				});
			};
		}
	]);

angular.module('SPA.Data.Grid', ['SPA.Extensions'])
	.directive('spaDataGrid', [
		'dgRow',
		function (Row) {
			return {
				restrict: 'E',
				replace: true,
				transcude: true,
				compile: function () {
					var idColumn = 'Id';

					var sortingColumn = null;
					var sortAsc = true;

					var sortData = function (rows) {
						if (!!sortingColumn) {
							var compFunc = function (v1, v2) {
								if (v1 > v2) {
									return 1;
								};

								if (v1 < v2) {
									return -1;
								};

								return 0;
							};

							if (SPA.Config.DataTypeIsDate(sortingColumn.DataType)) {
								compFunc = function (v1, v2) {
									return v1.diff(v2);
								};
							};

							rows.sort(function (r1, r2) {
								var v1 = r1.Data[sortingColumn.Binding];
								var v2 = r2.Data[sortingColumn.Binding];

								var num = compFunc(v1, v2);

								if (!sortAsc) {
									num = num * -1;
								};

								return num;
							})
						};
					};

					return {
						pre: function (scope, element) {
							scope.Contents = {
								Rows: []
							};

							var watcher = scope.$watch('data.length', function () {
								var rows = [];

								$.each(scope.data, function (i, r) {
									rows.push(new Row(r));
								});

								sortData(rows);

								scope.Contents.Rows = rows;
							});

							element.on('$destroy', function () {
								watcher();
							});

							var tId = $.trim(scope.idColumn);
							if (tId.length > 0) {
								idColumn = tId;
							};
						},
						post: function (scope) {
							var _editing = {};

							scope.Functions = {
								Edit: function (row) {
									var id = row.Data[idColumn];

									_editing[id] = {};

									var clone = angular.copy(row.Data);

									$.each(scope.config.Columns, function (i, col) {
										var d = clone[col.Binding];

										if (moment.isMoment(d)) {
											d = new moment(d.toDate());
										};

										_editing[id][col.Binding] = d;
									});

									row.IsEditing = true;
								},
								CancelEdit: function (row) {
									var id = row.Data[idColumn];

									$.each(scope.config.Columns, function (i, col) {
										row.Data[col.Binding] = _editing[id][col.Binding];
									});

									_editing[id] = null;

									row.IsEditing = false;
								},
								Save: function (row) {
									var id = row.Data[idColumn];

									scope.config.Save(row);

									row.IsEditing = false;
								},
								SortColumn: function (column) {
									if (!!sortingColumn && sortingColumn.Binding === column.Binding) {
										sortAsc = !sortAsc;
									};
									sortingColumn = column;
									sortData(scope.Contents.Rows)
								}
							};
						}
					};
				},
				templateUrl: SPA.Template('spa-data-grid', 'DataGrid'),
				scope: {
					data: '=',
					config: '=',
					idColumn: '@'
				}
			};
		}
	])
	.factory('dgRow',
		function () {
			return function (data) {
				var r = this;

				r.Selected = false;
				r.IsEditing = false;
				r.Data = data;

				r.SetEditing = function () {
					r.IsEditing = true;
				};

				r.CancelEdit = function () {
					r.IsEditing = false;
				};
			};
		})
	.factory('dgColumn',
		function () {
			var getTemplate = function (dt) {
				switch (dt) {
					case SPA.Config.DataTypes.Date:
					case SPA.Config.DataTypes.Time:
					case SPA.Config.DataTypes.DateTime:
						return 'date-time';
					case SPA.Config.DataTypes.Renters:
						return 'renters';
					case SPA.Config.DataTypes.Currency:
						return 'currency';
					case SPA.Config.DataTypes.String:
					default:
						return 'string';
				};
			};

			var getArgs = function () {
				return {
					dataType: SPA.Config.DataTypes.string,
					visible: false,
					dateFormat: SPA.Config.DateFormats.Year
				};
			};

			return function (args) {
				var c = this;

				var innerArgs = getArgs();

				$.extend(innerArgs, args);

				c.Title = innerArgs.title || innerArgs.binding;
				c.Binding = innerArgs.binding;
				c.DataType = innerArgs.dataType;
				c.DateFormat = innerArgs.dateFormat;

				c.Visible = innerArgs.visible === true;

				c.Template = 'dg-' + getTemplate(innerArgs.dataType);
			}
		})
	.factory('dgConfiguration',
		function () {
			var getDefaults = function () {
				return {
					columns: [],
					globalActions: {},
					rowActions: {},
					save: function () { }
				};
			};

			var getStyle = function (len) {
				return { width: 100 * len };
			};

			return function (config) {
				var c = this;

				var args = getDefaults();

				$.extend(args, config);

				c.Columns = args.columns;
				c.GlobalActions = args.globalActions;

				var rowActions = {};

				$.each(args.rowActions, function (group, actions) {
					rowActions[group] = {
						style: getStyle(actions.length),
						actions: actions
					};
				});

				c.RowActions = rowActions;
				c.Save = args.save;

				c.AddRowAction = function (group, action) {
					if (!c.RowActions[group]) {
						c.RowActions[group] = {};
					};

					c.RowActions[group].actions.push(action);
					c.RowActions[group].style = getStyle(c.RowActions[group].actions.length);
				};

				c.AddGlobalAction = function (name, action) {
					c.GlobalActions[name] = action;
				};
			};
		})
	.factory('dgFunction',
		function () {
			return function (text, callback) {
				var f = this;

				f.Text = text;
				if (!$.isFunction(callback)) {
					callback = function () {
						alert('The function for this event was never set. See console for more info');
						console.error('The callback function was never set', f);
					};
				};

				f.Click = callback;
			}
		})
	.directive('dgString',
		function () {
			return {
				restrict: 'E',
				replace: false,
				transclude: true,
				compile: function () {
					return {
						pre: function (scope, element) {
						},
						post: function (scope) {
						}
					};
				},
				templateUrl: SPA.Template('dg-input', 'DataGrid'),
				scope: {
					row: '=',
					column: '='
				}
			};
		})
	.directive('dgDateTime',
		function () {
			return {
				restrict: 'E',
				replace: true,
				transclude: true,
				compile: function () {
					var getOptions = function (col) {
						var format = 'day';

						if (col.DateFormat === SPA.Config.DateFormats.Month) {
							format = 'month'
						} else if (col.DateFormat === SPA.Config.DateFormats.Year) {
							format = 'year';
						};

						return {
							Mode: format,
							PickerOptions: {}
						};
					};

					return {
						pre: function (scope) {
							scope.Contents = {
								Format: null,
								EditValue: scope.row.Data[scope.column.Binding],
								Options: getOptions(scope.column)
							};
						},
						post: function (scope, element) {
							//todo: on change of value update row

							var valWatch = scope.$watch('Contents.EditValue', function (newVal) {
								var m = new moment(newVal);

								scope.Contents.Format = m.format(scope.column.DateFormat);
								scope.row.Data[scope.column.Binding] = m;
							});

							var editWatch = scope.$watch('row.IsEditing', function () {
								scope.Contents.EditValue = scope.row.Data[scope.column.Binding];
							});

							element.on('$destroy', function () {
								valWatch();
								editWatch();
							});
						}
					};
				},
				templateUrl: SPA.Template('dg-date-time', 'DataGrid'),
				scope: {
					row: '=',
					column: '='
				}
			};
		})
	.directive('dgCurrency',
		function () {
			return {
				restrict: 'E',
				replace: false,
				transclude: true,
				compile: function () {
					return {
						pre: function (scope, element) {
						},
						post: function (scope, element) {
							var watcher = scope.$watch('row.Data[column.Binding]', function (newVal, prevVal) {
								if (newVal === null || newVal === undefined) {
									scope.row.Data[scope.column.Binding] = prevVal;
									return;
								};

								//restrict to 100 digits after the decimal
								if (!/(^\d*(\.(\d{1,100})?)?$)/.test(newVal)) {
									scope.row.Data[scope.column.Binding] = prevVal;
									return;
								};
							});

							element.on('$destroy', function () {
								watcher();
							})
						}
					};
				},
				templateUrl: SPA.Template('dg-input', 'DataGrid'),
				scope: {
					row: '=',
					column: '='
				}
			};
		})
	.directive('dgRenters', [
		'Renters',
		function (renters) {
			return {
				restrict: 'E',
				replace: true,
				transclude: true,
				compile: function () {
					return {
						pre: function (scope, element) {
							scope.Contents = {
								Name: null,
								Value: null,
								Renters: renters.GetHash()
							};

							scope.Contents.Value = scope.row.Data[scope.column.Binding];

							var watcher = scope.$watch('Contents.Value', function (newVal) {
								scope.Contents.Name = scope.Contents.Renters[newVal].FullName
								scope.row.Data[scope.column.Binding] = newVal;
							});

							element.on('$destroy', function () {
								watcher();
							});
						}
					};
				},
				templateUrl: SPA.Template('dg-renters', 'DataGrid'),
				scope: {
					row: '=',
					column: '='
				}
			};
		}
	]);