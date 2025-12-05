/*
 * Created by EcoStruxure Automation Expert.
 * User: vv263
 * Date: 11/14/2025
 * Time: 12:50 PM
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
	/// Summary description for Composite.
	/// </summary>
	partial class Composite
	{
		#region Component Designer generated code
		/// <summary>
		/// Required method for Designer support - do not modify
		/// the contents of this method with the code editor.
		/// </summary>
		private void InitializeComponent()
		{
			this.PlantModel3 = new HMI.Main.Symbols.Model.sDefault();
			this.sDefault1 = new HMI.Main.Symbols.BasicSKILL.sDefault();
			this.sDefault2 = new HMI.Main.Symbols.BasicSKILL.sDefault();
			this.sDefault3 = new HMI.Main.Symbols.BasicSKILL.sDefault();
			// 
			// PlantModel3
			// 
			this.PlantModel3.BeginInit();
			this.PlantModel3.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.9849521203830367D, 0D, 0D, 1.0566037735849057D, 544D, 392D);
			this.PlantModel3.Name = "PlantModel3";
			this.PlantModel3.SecurityToken = ((uint)(4294967295u));
			this.PlantModel3.TagName = "4A8D83A809BBA1A9";
			this.PlantModel3.EndInit();
			// 
			// sDefault1
			// 
			this.sDefault1.BeginInit();
			this.sDefault1.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.46875D, 0D, 0D, 0.56896551724137934D, 736D, 32D);
			this.sDefault1.Name = "sDefault1";
			this.sDefault1.SecurityToken = ((uint)(4294967295u));
			this.sDefault1.TagName = "8F9989F3E21F250E.Skill_Head";
			this.sDefault1.EndInit();
			// 
			// sDefault2
			// 
			this.sDefault2.BeginInit();
			this.sDefault2.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.53776041666666663D, 0D, 0D, 0.627155172413793D, 67D, 37D);
			this.sDefault2.Name = "sDefault2";
			this.sDefault2.SecurityToken = ((uint)(4294967295u));
			this.sDefault2.TagName = "F579E9D7C38964EB.Skill_Commands";
			this.sDefault2.EndInit();
			// 
			// sDefault3
			// 
			this.sDefault3.BeginInit();
			this.sDefault3.DesignMatrix = new NxtControl.Drawing.Matrix2D(0.54166666666666663D, 0D, 0D, 0.689655172413793D, 72D, 360D);
			this.sDefault3.Name = "sDefault3";
			this.sDefault3.SecurityToken = ((uint)(4294967295u));
			this.sDefault3.TagName = "16341C3BD06240F9.Skill_Commands";
			this.sDefault3.EndInit();
			// 
			// Composite
			// 
			this.Bounds = new NxtControl.Drawing.RectF(((float)(0D)), ((float)(0D)), ((float)(1366D)), ((float)(698D)));
			this.Brush = new NxtControl.Drawing.Brush("CanvasBrush");
			this.Name = "Composite";
			this.Shapes.AddRange(new System.ComponentModel.IComponent[] {
			this.PlantModel3,
			this.sDefault1,
			this.sDefault2,
			this.sDefault3});
			this.Size = new System.Drawing.Size(1366, 698);

		}
		private HMI.Main.Symbols.Model.sDefault PlantModel3;
		private HMI.Main.Symbols.BasicSKILL.sDefault sDefault1;
		private HMI.Main.Symbols.BasicSKILL.sDefault sDefault2;
		private HMI.Main.Symbols.BasicSKILL.sDefault sDefault3;
		#endregion
	}
}
