/*
 * Created by EcoStruxure Automation Expert.
 * User: midxav
 * Date: 12/2/2024
 * Time: 9:45 AM
 * 
 */
using System;
using System.ComponentModel;
using System.Collections;
using System.Diagnostics;

using NxtControl.GuiFramework;

namespace HMI.Main.Canvases
{
	/// <summary>
	/// Summary description for Canvas2.
	/// </summary>
	partial class Canvas2
	{
		#region Component Designer generated code
		/// <summary>
		/// Required method for Designer support - do not modify
		/// the contents of this method with the code editor.
		/// </summary>
		private void InitializeComponent()
		{
			this.BasicSkillModel = new HMI.Main.Symbols.Model.sDefault();
			this.SkillGoToLeft = new HMI.Main.Symbols.BasicSKILL.sDefault();
			this.SkillGoToRight = new HMI.Main.Symbols.BasicSKILL.sDefault();
			this.SkillVaccumOFF = new HMI.Main.Symbols.BasicSKILL.sDefault();
			this.SkillVaccumOn = new HMI.Main.Symbols.BasicSKILL.sDefault();
			this.SkillMagPush = new HMI.Main.Symbols.BasicSKILL.sDefault();
			this.SkillToLoad = new HMI.Main.Symbols.BasicSKILL.sDefault();
			this.rectangle2 = new NxtControl.GuiFramework.Rectangle();
			this.rectangle1 = new NxtControl.GuiFramework.Rectangle();
			this.rectangle3 = new NxtControl.GuiFramework.Rectangle();
			this.rectangle4 = new NxtControl.GuiFramework.Rectangle();
			this.rectangle5 = new NxtControl.GuiFramework.Rectangle();
			this.rectangle6 = new NxtControl.GuiFramework.Rectangle();
			// 
			// BasicSkillModel
			// 
			this.BasicSkillModel.BeginInit();
			this.BasicSkillModel.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.73734610123119015D, 0D, 0D, 0.72830188679245278D, 400D, 272D);
			this.BasicSkillModel.Name = "BasicSkillModel";
			this.BasicSkillModel.SecurityToken = ((uint)(4294967295u));
			this.BasicSkillModel.TagName = "6A7240EE812C0DE0";
			this.BasicSkillModel.EndInit();
			// 
			// SkillGoToLeft
			// 
			this.SkillGoToLeft.BeginInit();
			this.SkillGoToLeft.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.48958333333333343D, 0D, 0D, 0.56896551724137945D, 8D, 0D);
			this.SkillGoToLeft.Name = "SkillGoToLeft";
			this.SkillGoToLeft.SecurityToken = ((uint)(4294967295u));
			this.SkillGoToLeft.TagName = "8C8F216321106413";
			this.SkillGoToLeft.EndInit();
			// 
			// SkillGoToRight
			// 
			this.SkillGoToRight.BeginInit();
			this.SkillGoToRight.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.49999999999999994D, 0D, 0D, 0.60344827586206884D, 0D, 272D);
			this.SkillGoToRight.Name = "SkillGoToRight";
			this.SkillGoToRight.SecurityToken = ((uint)(4294967295u));
			this.SkillGoToRight.TagName = "5A29C4CB9BCE5A88";
			this.SkillGoToRight.EndInit();
			// 
			// SkillVaccumOFF
			// 
			this.SkillVaccumOFF.BeginInit();
			this.SkillVaccumOFF.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.55208333333333337D, 0D, 0D, 0.61422413793103448D, 952D, 264D);
			this.SkillVaccumOFF.Name = "SkillVaccumOFF";
			this.SkillVaccumOFF.SecurityToken = ((uint)(4294967295u));
			this.SkillVaccumOFF.TagName = "EA5CCDB6677F426E";
			this.SkillVaccumOFF.EndInit();
			// 
			// SkillVaccumOn
			// 
			this.SkillVaccumOn.BeginInit();
			this.SkillVaccumOn.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.55208333333333326D, 0D, 0D, 0.51724137931034486D, 952D, 0D);
			this.SkillVaccumOn.Name = "SkillVaccumOn";
			this.SkillVaccumOn.SecurityToken = ((uint)(4294967295u));
			this.SkillVaccumOn.TagName = "62EA30D4329DDE17";
			this.SkillVaccumOn.EndInit();
			// 
			// SkillMagPush
			// 
			this.SkillMagPush.BeginInit();
			this.SkillMagPush.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.61458333333333348D, 0D, 0D, 0.55172413793103448D, 424D, 512D);
			this.SkillMagPush.Name = "SkillMagPush";
			this.SkillMagPush.SecurityToken = ((uint)(4294967295u));
			this.SkillMagPush.TagName = "14D802DB0D0F1DB7";
			this.SkillMagPush.EndInit();
			// 
			// SkillToLoad
			// 
			this.SkillToLoad.BeginInit();
			this.SkillToLoad.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.50260416666666663D, 0D, 0D, 0.5043103448275863D, 464D, 8D);
			this.SkillToLoad.Name = "SkillToLoad";
			this.SkillToLoad.SecurityToken = ((uint)(4294967295u));
			this.SkillToLoad.TagName = "B82348E21E6662A4";
			this.SkillToLoad.EndInit();
			// 
			// rectangle2
			// 
			this.rectangle2.Bounds = new NxtControl.Drawing.RectF(((float)(48D)), ((float)(512D)), ((float)(96D)), ((float)(24D)));
			this.rectangle2.Font = new NxtControl.Drawing.Font("HMI Sans Serif", 9F, System.Drawing.FontStyle.Regular);
			this.rectangle2.Name = "rectangle2";
			this.rectangle2.Text = "ARM TO RIGHT";
			this.rectangle2.TextAlignment = NxtControl.Drawing.ContentAlignment.MiddleCenter;
			// 
			// rectangle1
			// 
			this.rectangle1.Bounds = new NxtControl.Drawing.RectF(((float)(56D)), ((float)(232D)), ((float)(96D)), ((float)(24D)));
			this.rectangle1.Font = new NxtControl.Drawing.Font("HMI Sans Serif", 9F, System.Drawing.FontStyle.Regular);
			this.rectangle1.Name = "rectangle1";
			this.rectangle1.Text = "ARM TO LEFT";
			this.rectangle1.TextAlignment = NxtControl.Drawing.ContentAlignment.MiddleCenter;
			// 
			// rectangle3
			// 
			this.rectangle3.Bounds = new NxtControl.Drawing.RectF(((float)(552D)), ((float)(208D)), ((float)(96D)), ((float)(24D)));
			this.rectangle3.Font = new NxtControl.Drawing.Font("HMI Sans Serif", 9F, System.Drawing.FontStyle.Regular);
			this.rectangle3.Name = "rectangle3";
			this.rectangle3.Text = "LOAD";
			this.rectangle3.TextAlignment = NxtControl.Drawing.ContentAlignment.MiddleCenter;
			// 
			// rectangle4
			// 
			this.rectangle4.Bounds = new NxtControl.Drawing.RectF(((float)(544D)), ((float)(728D)), ((float)(96D)), ((float)(24D)));
			this.rectangle4.Font = new NxtControl.Drawing.Font("HMI Sans Serif", 9F, System.Drawing.FontStyle.Regular);
			this.rectangle4.Name = "rectangle4";
			this.rectangle4.Text = "PUSH WP";
			this.rectangle4.TextAlignment = NxtControl.Drawing.ContentAlignment.MiddleCenter;
			// 
			// rectangle5
			// 
			this.rectangle5.Bounds = new NxtControl.Drawing.RectF(((float)(1048D)), ((float)(208D)), ((float)(96D)), ((float)(24D)));
			this.rectangle5.Font = new NxtControl.Drawing.Font("HMI Sans Serif", 9F, System.Drawing.FontStyle.Regular);
			this.rectangle5.Name = "rectangle5";
			this.rectangle5.Text = "VACCUM ON";
			this.rectangle5.TextAlignment = NxtControl.Drawing.ContentAlignment.MiddleCenter;
			// 
			// rectangle6
			// 
			this.rectangle6.Bounds = new NxtControl.Drawing.RectF(((float)(1064D)), ((float)(512D)), ((float)(96D)), ((float)(24D)));
			this.rectangle6.Font = new NxtControl.Drawing.Font("HMI Sans Serif", 9F, System.Drawing.FontStyle.Regular);
			this.rectangle6.Name = "rectangle6";
			this.rectangle6.Text = "VACCUM OFF";
			this.rectangle6.TextAlignment = NxtControl.Drawing.ContentAlignment.MiddleCenter;
			// 
			// Canvas2
			// 
			this.Bounds = new NxtControl.Drawing.RectF(((float)(0D)), ((float)(0D)), ((float)(1366D)), ((float)(698D)));
			this.Brush = new NxtControl.Drawing.Brush("CanvasBrush");
			this.Name = "Canvas2";
			this.Shapes.AddRange(new System.ComponentModel.IComponent[] {
			this.BasicSkillModel,
			this.SkillGoToLeft,
			this.SkillGoToRight,
			this.SkillVaccumOFF,
			this.SkillVaccumOn,
			this.SkillMagPush,
			this.SkillToLoad,
			this.rectangle2,
			this.rectangle1,
			this.rectangle3,
			this.rectangle4,
			this.rectangle5,
			this.rectangle6});
			this.Size = new System.Drawing.Size(1366, 698);

		}
		private HMI.Main.Symbols.Model.sDefault BasicSkillModel;
		private HMI.Main.Symbols.BasicSKILL.sDefault SkillGoToLeft;
		private HMI.Main.Symbols.BasicSKILL.sDefault SkillGoToRight;
		private HMI.Main.Symbols.BasicSKILL.sDefault SkillVaccumOFF;
		private HMI.Main.Symbols.BasicSKILL.sDefault SkillVaccumOn;
		private HMI.Main.Symbols.BasicSKILL.sDefault SkillMagPush;
		private HMI.Main.Symbols.BasicSKILL.sDefault SkillToLoad;
		private NxtControl.GuiFramework.Rectangle rectangle2;
		private NxtControl.GuiFramework.Rectangle rectangle1;
		private NxtControl.GuiFramework.Rectangle rectangle3;
		private NxtControl.GuiFramework.Rectangle rectangle4;
		private NxtControl.GuiFramework.Rectangle rectangle5;
		private NxtControl.GuiFramework.Rectangle rectangle6;
		#endregion
	}
}
