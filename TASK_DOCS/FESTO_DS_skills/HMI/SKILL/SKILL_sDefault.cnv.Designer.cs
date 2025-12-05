/*
 * Created by EcoStruxure Automation Expert.
 * User: midxav
 * Date: 1/31/2024
 * Time: 11:06 AM
 * 
 */
using System;
using System.ComponentModel;
using System.Collections;
using NxtControl.GuiFramework;

namespace HMI.Main.Symbols.SKILL
{
	/// <summary>
	/// Summary description for sDefault.
	/// </summary>
	partial class sDefault
	{

		#region Component Designer generated code
		/// <summary>
		/// Required method for Designer support - do not modify
		/// the contents of this method with the code editor.
		/// </summary>
		private void InitializeComponent()
		{
			this.rectangle1 = new NxtControl.GuiFramework.Rectangle();
			this.rectangle2 = new NxtControl.GuiFramework.Rectangle();
			this.freeText1 = new NxtControl.GuiFramework.FreeText();
			this.freeText2 = new NxtControl.GuiFramework.FreeText();
			this.IN1BOX = new NxtControl.GuiFramework.DrawnTextBox();
			this.freeText3 = new NxtControl.GuiFramework.FreeText();
			this.SetParameterBox = new NxtControl.GuiFramework.DrawnButton();
			this.freeText4 = new NxtControl.GuiFramework.FreeText();
			this.freeText5 = new NxtControl.GuiFramework.FreeText();
			this.AbortButton = new NxtControl.GuiFramework.DrawnButton();
			this.HoldButton = new NxtControl.GuiFramework.DrawnButton();
			this.StartButton = new NxtControl.GuiFramework.DrawnButton();
			this.SuspendButton = new NxtControl.GuiFramework.DrawnButton();
			this.UnsuspendButton = new NxtControl.GuiFramework.DrawnButton();
			this.ClearButton = new NxtControl.GuiFramework.DrawnButton();
			this.ResetButton = new NxtControl.GuiFramework.DrawnButton();
			this.StopButton = new NxtControl.GuiFramework.DrawnButton();
			this.UnholdButton = new NxtControl.GuiFramework.DrawnButton();
			this.rectangle3 = new NxtControl.GuiFramework.Rectangle();
			this.CURRENT_STATE = new System.HMI.Symbols.Base.TextBox<short>();
			this.OUT1 = new System.HMI.Symbols.Base.TextBox<short>();
			this.CurrentStateBox = new NxtControl.GuiFramework.DrawnTextBox();
			// 
			// rectangle1
			// 
			this.rectangle1.Bounds = new NxtControl.Drawing.RectF(((float)(64D)), ((float)(8D)), ((float)(768D)), ((float)(464D)));
			this.rectangle1.Font = new NxtControl.Drawing.Font("HMI Sans Serif", 9F, System.Drawing.FontStyle.Regular);
			this.rectangle1.Name = "rectangle1";
			this.rectangle1.TextAlignment = NxtControl.Drawing.ContentAlignment.MiddleCenter;
			// 
			// rectangle2
			// 
			this.rectangle2.Bounds = new NxtControl.Drawing.RectF(((float)(504D)), ((float)(64D)), ((float)(296D)), ((float)(352D)));
			this.rectangle2.Font = new NxtControl.Drawing.Font("HMI Sans Serif", 9F, System.Drawing.FontStyle.Regular);
			this.rectangle2.Name = "rectangle2";
			// 
			// freeText1
			// 
			this.freeText1.Color = new NxtControl.Drawing.Color("LabelTextColor");
			this.freeText1.Font = new NxtControl.Drawing.Font("LabelFont");
			this.freeText1.Location = new NxtControl.Drawing.PointF(520D, 80D);
			this.freeText1.Name = "freeText1";
			this.freeText1.Text = "Parameters:";
			// 
			// freeText2
			// 
			this.freeText2.Color = new NxtControl.Drawing.Color("LabelTextColor");
			this.freeText2.Font = new NxtControl.Drawing.Font("LabelFont");
			this.freeText2.Location = new NxtControl.Drawing.PointF(528D, 144D);
			this.freeText2.Name = "freeText2";
			this.freeText2.Text = "Input 1";
			// 
			// IN1BOX
			// 
			this.IN1BOX.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.IN1BOX.Bounds = new NxtControl.Drawing.RectF(((float)(619D)), ((float)(136D)), ((float)(144D)), ((float)(25D)));
			this.IN1BOX.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.IN1BOX.FontScale = true;
			this.IN1BOX.Maximum = 100D;
			this.IN1BOX.Minimum = 0D;
			this.IN1BOX.Name = "IN1BOX";
			this.IN1BOX.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.IN1BOX.TextAutoSizeHorizontalOffset = 10;
			this.IN1BOX.TextAutoSizeVerticalOffset = 2;
			this.IN1BOX.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// freeText3
			// 
			this.freeText3.Color = new NxtControl.Drawing.Color("LabelTextColor");
			this.freeText3.Font = new NxtControl.Drawing.Font("LabelFont");
			this.freeText3.Location = new NxtControl.Drawing.PointF(528D, 328D);
			this.freeText3.Name = "freeText3";
			this.freeText3.Text = "Output 1";
			// 
			// SetParameterBox
			// 
			this.SetParameterBox.Bounds = new NxtControl.Drawing.RectF(((float)(619D)), ((float)(184D)), ((float)(144D)), ((float)(25D)));
			this.SetParameterBox.Brush = new NxtControl.Drawing.Brush("ButtonBrush");
			this.SetParameterBox.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.SetParameterBox.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.SetParameterBox.Name = "SetParameterBox";
			this.SetParameterBox.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.SetParameterBox.Radius = 4D;
			this.SetParameterBox.Text = "Set Parameters";
			this.SetParameterBox.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.SetParameterBox.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.SetParameterBox.Use3DEffect = false;
			this.SetParameterBox.Click += new System.EventHandler(this.SetParametersClick);
			// 
			// freeText4
			// 
			this.freeText4.Color = new NxtControl.Drawing.Color("LabelTextColor");
			this.freeText4.Font = new NxtControl.Drawing.Font("LabelFont");
			this.freeText4.Location = new NxtControl.Drawing.PointF(96D, 64D);
			this.freeText4.Name = "freeText4";
			this.freeText4.Text = "Current State:";
			// 
			// freeText5
			// 
			this.freeText5.Color = new NxtControl.Drawing.Color("LabelTextColor");
			this.freeText5.Font = new NxtControl.Drawing.Font("LabelFont");
			this.freeText5.Location = new NxtControl.Drawing.PointF(96D, 120D);
			this.freeText5.Name = "freeText5";
			this.freeText5.Text = "Executable Transitions:";
			// 
			// AbortButton
			// 
			this.AbortButton.Bounds = new NxtControl.Drawing.RectF(((float)(104D)), ((float)(192D)), ((float)(100D)), ((float)(25D)));
			this.AbortButton.Brush = new NxtControl.Drawing.Brush(new NxtControl.Drawing.Color(((byte)(186)), ((byte)(70)), ((byte)(66))));
			this.AbortButton.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.AbortButton.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.AbortButton.Name = "AbortButton";
			this.AbortButton.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.AbortButton.Radius = 4D;
			this.AbortButton.Text = "Abort";
			this.AbortButton.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.AbortButton.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.AbortButton.Use3DEffect = false;
			this.AbortButton.Click += new System.EventHandler(this.AbortClick);
			// 
			// HoldButton
			// 
			this.HoldButton.Bounds = new NxtControl.Drawing.RectF(((float)(104D)), ((float)(238D)), ((float)(100D)), ((float)(25D)));
			this.HoldButton.Brush = new NxtControl.Drawing.Brush(new NxtControl.Drawing.Color(((byte)(154)), ((byte)(154)), ((byte)(154))));
			this.HoldButton.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.HoldButton.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.HoldButton.Name = "HoldButton";
			this.HoldButton.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.HoldButton.Radius = 4D;
			this.HoldButton.Text = "Hold";
			this.HoldButton.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.HoldButton.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.HoldButton.Use3DEffect = false;
			this.HoldButton.Click += new System.EventHandler(this.HoldClick);
			// 
			// StartButton
			// 
			this.StartButton.Bounds = new NxtControl.Drawing.RectF(((float)(104D)), ((float)(284D)), ((float)(100D)), ((float)(25D)));
			this.StartButton.Brush = new NxtControl.Drawing.Brush(new NxtControl.Drawing.Color(((byte)(150)), ((byte)(182)), ((byte)(86))));
			this.StartButton.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.StartButton.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.StartButton.Name = "StartButton";
			this.StartButton.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.StartButton.Radius = 4D;
			this.StartButton.Text = "Start";
			this.StartButton.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.StartButton.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.StartButton.Use3DEffect = false;
			this.StartButton.Click += new System.EventHandler(this.StartClick);
			// 
			// SuspendButton
			// 
			this.SuspendButton.Bounds = new NxtControl.Drawing.RectF(((float)(104D)), ((float)(330D)), ((float)(100D)), ((float)(25D)));
			this.SuspendButton.Brush = new NxtControl.Drawing.Brush(new NxtControl.Drawing.Color(((byte)(154)), ((byte)(154)), ((byte)(154))));
			this.SuspendButton.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.SuspendButton.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.SuspendButton.Name = "SuspendButton";
			this.SuspendButton.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.SuspendButton.Radius = 4D;
			this.SuspendButton.Text = "Suspend";
			this.SuspendButton.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.SuspendButton.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.SuspendButton.Use3DEffect = false;
			this.SuspendButton.Click += new System.EventHandler(this.SuspendClick);
			// 
			// UnsuspendButton
			// 
			this.UnsuspendButton.Bounds = new NxtControl.Drawing.RectF(((float)(104D)), ((float)(376D)), ((float)(100D)), ((float)(25D)));
			this.UnsuspendButton.Brush = new NxtControl.Drawing.Brush(new NxtControl.Drawing.Color(((byte)(75)), ((byte)(172)), ((byte)(198))));
			this.UnsuspendButton.ButtonPushedBrush = new NxtControl.Drawing.Brush(new NxtControl.Drawing.Color(((byte)(75)), ((byte)(172)), ((byte)(198))));
			this.UnsuspendButton.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.UnsuspendButton.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.UnsuspendButton.Name = "UnsuspendButton";
			this.UnsuspendButton.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.UnsuspendButton.Radius = 4D;
			this.UnsuspendButton.Text = "Unsuspend";
			this.UnsuspendButton.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.UnsuspendButton.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.UnsuspendButton.Use3DEffect = false;
			this.UnsuspendButton.Click += new System.EventHandler(this.UnsuspendClick);
			// 
			// ClearButton
			// 
			this.ClearButton.Bounds = new NxtControl.Drawing.RectF(((float)(248D)), ((float)(192D)), ((float)(100D)), ((float)(25D)));
			this.ClearButton.Brush = new NxtControl.Drawing.Brush(new NxtControl.Drawing.Color(((byte)(154)), ((byte)(154)), ((byte)(154))));
			this.ClearButton.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.ClearButton.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.ClearButton.Name = "ClearButton";
			this.ClearButton.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.ClearButton.Radius = 4D;
			this.ClearButton.Text = "Clear";
			this.ClearButton.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.ClearButton.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.ClearButton.Use3DEffect = false;
			this.ClearButton.Click += new System.EventHandler(this.ClearClick);
			// 
			// ResetButton
			// 
			this.ResetButton.Bounds = new NxtControl.Drawing.RectF(((float)(248D)), ((float)(237D)), ((float)(100D)), ((float)(25D)));
			this.ResetButton.Brush = new NxtControl.Drawing.Brush(new NxtControl.Drawing.Color(((byte)(154)), ((byte)(154)), ((byte)(154))));
			this.ResetButton.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.ResetButton.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.ResetButton.Name = "ResetButton";
			this.ResetButton.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.ResetButton.Radius = 4D;
			this.ResetButton.Text = "Reset";
			this.ResetButton.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.ResetButton.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.ResetButton.Use3DEffect = false;
			this.ResetButton.Click += new System.EventHandler(this.ResetClick);
			// 
			// StopButton
			// 
			this.StopButton.Bounds = new NxtControl.Drawing.RectF(((float)(248D)), ((float)(282D)), ((float)(100D)), ((float)(25D)));
			this.StopButton.Brush = new NxtControl.Drawing.Brush(new NxtControl.Drawing.Color(((byte)(186)), ((byte)(70)), ((byte)(66))));
			this.StopButton.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.StopButton.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.StopButton.Name = "StopButton";
			this.StopButton.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.StopButton.Radius = 4D;
			this.StopButton.Text = "Stop";
			this.StopButton.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.StopButton.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.StopButton.Use3DEffect = false;
			this.StopButton.Click += new System.EventHandler(this.StopClick);
			// 
			// UnholdButton
			// 
			this.UnholdButton.Bounds = new NxtControl.Drawing.RectF(((float)(248D)), ((float)(328D)), ((float)(100D)), ((float)(25D)));
			this.UnholdButton.Brush = new NxtControl.Drawing.Brush(new NxtControl.Drawing.Color(((byte)(75)), ((byte)(172)), ((byte)(198))));
			this.UnholdButton.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.UnholdButton.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.UnholdButton.Name = "UnholdButton";
			this.UnholdButton.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.UnholdButton.Radius = 4D;
			this.UnholdButton.Text = "Unhold";
			this.UnholdButton.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.UnholdButton.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.UnholdButton.Use3DEffect = false;
			this.UnholdButton.Click += new System.EventHandler(this.UnholdClick);
			// 
			// rectangle3
			// 
			this.rectangle3.Bounds = new NxtControl.Drawing.RectF(((float)(444D)), ((float)(17D)), ((float)(40D)), ((float)(22D)));
			this.rectangle3.Brush = new NxtControl.Drawing.Brush();
			this.rectangle3.Font = new NxtControl.Drawing.Font("HMI Sans Serif", 9F, System.Drawing.FontStyle.Regular);
			this.rectangle3.Name = "rectangle3";
			this.rectangle3.Pen = new NxtControl.Drawing.Pen(new NxtControl.Drawing.Color(((byte)(255)), ((byte)(255)), ((byte)(255))), 1F, NxtControl.Drawing.DashStyle.Solid);
			this.rectangle3.Text = "SKILL";
			this.rectangle3.TextAlignment = NxtControl.Drawing.ContentAlignment.MiddleCenter;
			this.rectangle3.TextAutoSize = true;
			// 
			// CURRENT_STATE
			// 
			this.CURRENT_STATE.BeginInit();
			this.CURRENT_STATE.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.26666666666666666D, 0D, 0D, 1D, 224D, 56D);
			this.CURRENT_STATE.IsOnlyInput = true;
			this.CURRENT_STATE.MaximumTag = null;
			this.CURRENT_STATE.MinimumTag = null;
			this.CURRENT_STATE.Name = "CURRENT_STATE";
			this.CURRENT_STATE.NumberBase = NxtControl.GuiFramework.NumberBase.Decimal;
			this.CURRENT_STATE.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.CURRENT_STATE.SetColor = new NxtControl.Drawing.Color("Yellow");
			this.CURRENT_STATE.TagName = "CURRENT_STATE";
			this.CURRENT_STATE.TextAlignment = NxtControl.Drawing.ContentAlignment.MiddleLeft;
			this.CURRENT_STATE.Value = ((short)(0));
			this.CURRENT_STATE.ValueChanged += new System.EventHandler<NxtControl.GuiFramework.ValueChangedEventArgs>(this.ValueChange);
			this.CURRENT_STATE.EndInit();
			// 
			// OUT1
			// 
			this.OUT1.BeginInit();
			this.OUT1.DesignMatrix = new NxtControl.Drawing.Matrix2D(1D, 0D, 0D, 1D, 616D, 320D);
			this.OUT1.IsOnlyInput = true;
			this.OUT1.MaximumTag = null;
			this.OUT1.MinimumTag = null;
			this.OUT1.Name = "OUT1";
			this.OUT1.NumberBase = NxtControl.GuiFramework.NumberBase.Decimal;
			this.OUT1.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.OUT1.SetColor = new NxtControl.Drawing.Color("Yellow");
			this.OUT1.TagName = "OUT1";
			this.OUT1.TextAlignment = NxtControl.Drawing.ContentAlignment.MiddleLeft;
			this.OUT1.Value = ((short)(0));
			this.OUT1.EndInit();
			// 
			// CurrentStateBox
			// 
			this.CurrentStateBox.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.CurrentStateBox.Bounds = new NxtControl.Drawing.RectF(((float)(288D)), ((float)(56D)), ((float)(152D)), ((float)(25D)));
			this.CurrentStateBox.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.CurrentStateBox.Maximum = 100D;
			this.CurrentStateBox.Minimum = 0D;
			this.CurrentStateBox.Name = "CurrentStateBox";
			this.CurrentStateBox.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.CurrentStateBox.TextAutoSizeHorizontalOffset = 10;
			this.CurrentStateBox.TextAutoSizeVerticalOffset = 2;
			this.CurrentStateBox.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// sDefault
			// 
			this.Name = "sDefault";
			this.Shapes.AddRange(new System.ComponentModel.IComponent[] {
			this.rectangle1,
			this.rectangle2,
			this.freeText1,
			this.freeText2,
			this.IN1BOX,
			this.freeText3,
			this.SetParameterBox,
			this.freeText4,
			this.freeText5,
			this.AbortButton,
			this.HoldButton,
			this.StartButton,
			this.SuspendButton,
			this.UnsuspendButton,
			this.ClearButton,
			this.ResetButton,
			this.StopButton,
			this.UnholdButton,
			this.rectangle3,
			this.CURRENT_STATE,
			this.OUT1,
			this.CurrentStateBox});
			this.SymbolSize = new System.Drawing.Size(888, 496);

		}
		private NxtControl.GuiFramework.Rectangle rectangle1;
		private NxtControl.GuiFramework.Rectangle rectangle2;
		private NxtControl.GuiFramework.FreeText freeText1;
		private NxtControl.GuiFramework.FreeText freeText2;
		private NxtControl.GuiFramework.DrawnTextBox IN1BOX;
		private NxtControl.GuiFramework.FreeText freeText3;
		private NxtControl.GuiFramework.DrawnButton SetParameterBox;
		private NxtControl.GuiFramework.FreeText freeText4;
		private NxtControl.GuiFramework.FreeText freeText5;
		private NxtControl.GuiFramework.DrawnButton AbortButton;
		private NxtControl.GuiFramework.DrawnButton HoldButton;
		private NxtControl.GuiFramework.DrawnButton StartButton;
		private NxtControl.GuiFramework.DrawnButton SuspendButton;
		private NxtControl.GuiFramework.DrawnButton UnsuspendButton;
		private NxtControl.GuiFramework.DrawnButton ClearButton;
		private NxtControl.GuiFramework.DrawnButton ResetButton;
		private NxtControl.GuiFramework.DrawnButton StopButton;
		private NxtControl.GuiFramework.DrawnButton UnholdButton;
		private NxtControl.GuiFramework.Rectangle rectangle3;
		private System.HMI.Symbols.Base.TextBox<short> CURRENT_STATE;
		private System.HMI.Symbols.Base.TextBox<short> OUT1;
		private NxtControl.GuiFramework.DrawnTextBox CurrentStateBox;
		#endregion
	}
}
